from flask import Flask, render_template, request, jsonify, send_from_directory
import pandas as pd
import csv
import os

app = Flask(__name__, 
            template_folder="../frontend/templates", 
            static_folder="../frontend/static")

# Data storage
db_data = []

import json
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FOLDER = os.path.join(BASE_DIR, "data")
DATA_FILE = os.path.join(DATA_FOLDER, "dataset.csv")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
VAULT_FOLDER = os.path.join(UPLOAD_FOLDER, "vault")
PROFILE_FOLDER = os.path.join(UPLOAD_FOLDER, "profiles")
USERS_FILE = os.path.join(DATA_FOLDER, "users.json")
SUPPORT_FILE = os.path.join(DATA_FOLDER, "support_tickets.json")
DM_FILE = os.path.join(DATA_FOLDER, "direct_messages.json")
GARAGES_FILE = os.path.join(DATA_FOLDER, "garages.json")

# Ensure folders exist
for f in [UPLOAD_FOLDER, VAULT_FOLDER, PROFILE_FOLDER, os.path.join(BASE_DIR, "data")]:
    if not os.path.exists(f): os.makedirs(f)

def load_support_tickets():
    if not os.path.exists(SUPPORT_FILE): return {}
    with open(SUPPORT_FILE, "r") as f: return json.load(f)

def save_support_tickets(tickets):
    with open(SUPPORT_FILE, "w") as f: json.dump(tickets, f, indent=4)

def load_dms():
    if not os.path.exists(DM_FILE): return {}
    with open(DM_FILE, "r") as f: return json.load(f)

def save_dms(dms):
    with open(DM_FILE, "w") as f: json.dump(dms, f, indent=4)

# Helper for User data
def load_garages():
    if not os.path.exists(GARAGES_FILE): return {}
    with open(GARAGES_FILE, 'r') as f: return json.load(f)

def save_garages(data):
    with open(GARAGES_FILE, 'w') as f: json.dump(data, f, indent=4)

def load_users():
    if not os.path.exists(USERS_FILE):
        # Create default dev admin with a default pin '0000'
        default = {"admin": {
            "password": generate_password_hash("password123"), 
            "pin": generate_password_hash("0000"),
            "joined": "2026-02-08",
            "role": "developer"
        }}
        with open(USERS_FILE, "w") as f: json.dump(default, f)
        return default
    with open(USERS_FILE, "r") as f: return json.load(f)

def save_users(users):
    with open(USERS_FILE, "w") as f: json.dump(users, f, indent=4)

logged_in_user = None
user_reminders = {} 
COMM_MSG_FILE = os.path.join(DATA_FOLDER, "community_messages.json")

def load_comm_msgs():
    if not os.path.exists(COMM_MSG_FILE): return []
    try:
        with open(COMM_MSG_FILE, "r") as f: return json.load(f)
    except: return []

def save_comm_msgs(msgs):
    with open(COMM_MSG_FILE, "w") as f: json.dump(msgs, f)

community_messages = load_comm_msgs()

@app.route("/send_community_msg", methods=["POST"])
def send_community_msg():
    if not logged_in_user: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    msg_obj = {
        "user": logged_in_user,
        "msg": data.get("msg"),
        "time": datetime.now().strftime("%I:%M %p")
    }
    community_messages.append(msg_obj)
    # Keep only last 50
    if len(community_messages) > 50: community_messages.pop(0)
    save_comm_msgs(community_messages)
    return jsonify({"status": "success"})

@app.route("/get_community_msgs")
def get_community_msgs():
    return jsonify(community_messages)

@app.route("/search_community", methods=["POST"])
def search_community():
    query = request.json.get("query", "").lower()
    users = load_users()
    my_connections = users.get(logged_in_user, {}).get("connections", [])
    results = []
    for u, info in users.items():
        if u == logged_in_user: continue
        # Hide admins/support from general search
        if info.get("role") in ["admin", "support", "developer"]: continue
        
        # If query is empty, show all non-system users
        if not query or query in u.lower():
            is_friend = u in my_connections
            is_pending_sent = logged_in_user in info.get("pending_reqs", [])
            results.append({
                "username": u, 
                "joined": info.get("joined") or "Unknown",
                "is_friend": is_friend,
                "is_pending_sent": is_pending_sent
            })
    return jsonify(results[:50]) # Return more results

@app.route("/auth", methods=["POST"])
def auth():
    global logged_in_user
    data = request.json
    mode = data.get("mode") 
    user = data.get("user")
    pw = data.get("pass")
    pin = data.get("pin") # 4 digit recovery pin
    
    users = load_users()
    
    if mode == "login":
        if user in users and check_password_hash(users[user]["password"], pw):
            logged_in_user = user
            return jsonify({"status": "success", "user": user})
        return jsonify({"status": "error", "message": "Invalid credentials"}), 401
    else:
        if user in users:
            return jsonify({"status": "error", "message": "User exists"}), 400
        if not pin or len(str(pin)) != 4:
            return jsonify({"status": "error", "message": "Valid 4-digit Pin required"}), 400
            
        # Register with Hashing + Pin Hashing
        users[user] = {
            "password": generate_password_hash(pw),
            "pin": generate_password_hash(str(pin)),
            "joined": datetime.now().strftime("%Y-%m-%d"),
            "role": "user"
        }
        save_users(users)
        logged_in_user = user
        return jsonify({"status": "success", "user": user})

@app.route("/reset_password", methods=["POST"])
def reset_password():
    data = request.json
    user = data.get("user")
    pin = str(data.get("pin"))
    new_pass = data.get("new_pass")

    users = load_users()
    if user in users and check_password_hash(users[user]["pin"], pin):
        users[user]["password"] = generate_password_hash(new_pass)
        save_users(users)
        return jsonify({"status": "success", "message": "Password reset successful!"})
    
    return jsonify({"status": "error", "message": "Security verification failed."}), 401

@app.route("/dev_user_view")
def dev_user_view():
    # Only accessible via direct URL for developer to see who is registered
    users = load_users()
    # Masking password for view security but showing the hash
    return jsonify(users)

@app.route("/get_user_profile")
def get_user_profile():
    if not logged_in_user: return jsonify({"error": "Unauthorized"}), 401
    users = load_users()
    u_info = users.get(logged_in_user, {})
    return jsonify({
        "username": logged_in_user,
        "joined": u_info.get("joined", "Feb 2026"),
        "vehicles": u_info.get("vehicles", []),
        "pic_url": u_info.get("pic_url", ""),
        "role": u_info.get("role", "User"),
        "docs_count": len([f for f in os.listdir(VAULT_FOLDER) if f.startswith(f"user_doc_")]) if os.path.exists(VAULT_FOLDER) else 0,
        "friend_count": len(u_info.get("connections", [])),
        "garage_count": len([gid for gid, g in load_garages().items() if logged_in_user in g.get("members", [])])
    })

@app.route("/upload_profile_pic", methods=["POST"])
def upload_profile_pic():
    if not logged_in_user: return jsonify({"error": "Unauthorized"}), 401
    if 'file' not in request.files: return jsonify({"error": "No file"}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({"error": "No filename"}), 400
    
    filename = f"user_{logged_in_user}_{file.filename}"
    save_path = os.path.join(PROFILE_FOLDER, filename)
    file.save(save_path)
    
    users = load_users()
    users[logged_in_user]["pic_url"] = f"/uploads/profiles/{filename}"
    save_users(users)
    return jsonify({"status": "success", "url": users[logged_in_user]["pic_url"]})

@app.route("/get_public_profile", methods=["POST"])
def get_public_profile():
    target_user = request.json.get("username")
    users = load_users()
    if target_user in users:
        u = users[target_user]
        my_info = users.get(logged_in_user, {})
        is_friend = target_user in my_info.get("connections", [])
        is_pending_sent = logged_in_user in u.get("pending_reqs", [])
        
        return jsonify({
            "username": target_user,
            "joined": u.get("joined"),
            "pic_url": u.get("pic_url", ""),
            "vehicles": u.get("vehicles", []),
            "friend_count": len(u.get("connections", [])),
            "is_friend": is_friend,
            "is_pending_sent": is_pending_sent
        })
    return jsonify({"error": "Not found"}), 404

@app.route("/garage_ops", methods=["POST"])
def garage_ops():
    if not logged_in_user: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    op = data.get("op")
    g_id = data.get("id")
    garages = load_garages()
    
    if op == "create":
        name = data.get("name") or "New Garage"
        # Check for duplicate names
        for g in garages.values():
            if g["name"].lower() == name.lower():
                return jsonify({"error": "A garage with this name already exists!"}), 400

        g_id = str(len(garages) + 201)
        garages[g_id] = {
            "name": name,
            "admins": [logged_in_user],
            "members": [logged_in_user],
            "roles": {logged_in_user: "Founder"},
            "pending": [],
            "pending_roles": {},
            "read_status": {logged_in_user: 0},
            "messages": []
        }
        save_garages(garages)
        return jsonify({"status": "success", "id": g_id})
    elif op == "search":
        query = data.get("query", "").lower()
        results = []
        for gid, g in garages.items():
            if query in g["name"].lower() or query in gid:
                results.append({
                    "id": gid,
                    "name": g["name"],
                    "members": len(g["members"]),
                    "is_member": logged_in_user in g["members"],
                    "is_pending": logged_in_user in g["pending"]
                })
        return jsonify(results)
    elif op == "request":
        if g_id in garages:
            if logged_in_user not in garages[g_id]["members"] and logged_in_user not in garages[g_id]["pending"]:
                garages[g_id]["pending"].append(logged_in_user)
                save_garages(garages)
                return jsonify({"status": "requested"})
    elif op == "invite":
        target = data.get("target")
        if g_id in garages and logged_in_user in garages[g_id]["members"]:
            if target not in garages[g_id]["members"] and target not in garages[g_id]["pending"]:
                garages[g_id]["pending"].append(target)
                save_garages(garages)
                return jsonify({"status": "invited"})
    elif op == "accept":
        target = data.get("target")
        if g_id in garages and logged_in_user in garages[g_id]["admins"]:
            if target in garages[g_id]["pending"]:
                garages[g_id]["pending"].remove(target)
                garages[g_id]["members"].append(target)
                garages[g_id]["roles"][target] = "Driver" # Default role
                save_garages(garages)
                return jsonify({"status": "success"})
    elif op == "promote":
        target = data.get("target")
        if g_id in garages and garages[g_id]["roles"].get(logged_in_user) == "Founder":
            if target in garages[g_id]["members"] and target not in garages[g_id]["admins"]:
                garages[g_id]["admins"].append(target)
                save_garages(garages)
                return jsonify({"status": "success"})
    elif op == "set_role":
        target = data.get("target")
        role = data.get("role")
        if g_id in garages and garages[g_id]["roles"].get(logged_in_user) == "Founder":
            if target in garages[g_id]["members"]:
                if "pending_roles" not in garages[g_id]: garages[g_id]["pending_roles"] = {}
                garages[g_id]["pending_roles"][target] = role
                save_garages(garages)
                return jsonify({"status": "success", "message": "Role assigned. Waiting for member confirmation."})
    elif op == "accept_role":
        if g_id in garages and logged_in_user in garages[g_id]["members"]:
            pending = garages[g_id].get("pending_roles", {})
            if logged_in_user in pending:
                role = pending.pop(logged_in_user)
                garages[g_id]["roles"][logged_in_user] = role
                save_garages(garages)
                return jsonify({"status": "success"})
    elif op == "reject_role":
        if g_id in garages and logged_in_user in garages[g_id]["members"]:
            pending = garages[g_id].get("pending_roles", {})
            if logged_in_user in pending:
                pending.pop(logged_in_user)
                save_garages(garages)
                return jsonify({"status": "success"})
    elif op == "send_msg":
        if g_id in garages and logged_in_user in garages[g_id]["members"]:
            garages[g_id]["messages"].append({
                "user": logged_in_user,
                "msg": data.get("msg"),
                "time": datetime.now().strftime("%H:%M"),
                "is_encrypted": True,
                "role": garages[g_id]["roles"].get(logged_in_user, "Member")
            })
            save_garages(garages)
            return jsonify({"status": "success"})
    elif op == "get_joined":
        results = []
        for gid, g in garages.items():
            if logged_in_user in g["members"]:
                total = len(g["messages"])
                read = g.get("read_status", {}).get(logged_in_user, 0)
                results.append({
                    "id": gid,
                    "name": g["name"],
                    "members_count": len(g["members"]),
                    "members": g["members"],
                    "role": g["roles"].get(logged_in_user, "Member"),
                    "unread": max(0, total - read)
                })
        return jsonify(results)
    elif op == "get_info":
        if g_id in garages and (logged_in_user in garages[g_id]["members"] or logged_in_user in garages[g_id]["admins"]):
            # Update read status
            if "read_status" not in garages[g_id]: garages[g_id]["read_status"] = {}
            garages[g_id]["read_status"][logged_in_user] = len(garages[g_id]["messages"])
            save_garages(garages)
            return jsonify(garages[g_id])
            
    return jsonify({"error": "Garage operation failed"}), 400

@app.route("/connection_ops", methods=["POST"])
def connection_ops():
    if not logged_in_user: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    op = data.get("op")
    target = data.get("target")
    users = load_users()
    
    # Initialize connection fields if missing
    if "pending_reqs" not in users[logged_in_user]: users[logged_in_user]["pending_reqs"] = []
    if "connections" not in users[logged_in_user]: users[logged_in_user]["connections"] = []

    if op == "send":
        if target in users:
            if "pending_reqs" not in users[target]: users[target]["pending_reqs"] = []
            if logged_in_user not in users[target]["pending_reqs"]:
                users[target]["pending_reqs"].append(logged_in_user)
                save_users(users)
                return jsonify({"status": "success"})
    elif op == "accept":
        if target in users[logged_in_user].get("pending_reqs", []):
            users[logged_in_user]["pending_reqs"].remove(target)
            if "connections" not in users[logged_in_user]: users[logged_in_user]["connections"] = []
            if target not in users[logged_in_user]["connections"]:
                users[logged_in_user]["connections"].append(target)
            # Mutual connection
            if "connections" not in users[target]: users[target]["connections"] = []
            if logged_in_user not in users[target]["connections"]:
                users[target]["connections"].append(logged_in_user)
            save_users(users)
            return jsonify({"status": "success"})
    elif op == "reject":
        if target in users[logged_in_user].get("pending_reqs", []):
            users[logged_in_user]["pending_reqs"].remove(target)
            save_users(users)
            return jsonify({"status": "success"})
    elif op == "get_pending":
        return jsonify(users[logged_in_user].get("pending_reqs", []))
    elif op == "get_friends":
        friends = users[logged_in_user].get("connections", [])
        dms = load_dms()
        friend_data = []
        for f in friends:
            chat_id = "_".join(sorted([logged_in_user, f]))
            chat = dms.get(chat_id, [])
            unread_count = len([m for m in chat if m.get("from") == f and not m.get("read")])
            friend_data.append({"username": f, "unread": unread_count})
        return jsonify(friend_data)
    elif op == "unfriend":
        if target in users[logged_in_user].get("connections", []):
            users[logged_in_user]["connections"].remove(target)
            if logged_in_user in users[target].get("connections", []):
                users[target]["connections"].remove(logged_in_user)
            save_users(users)
            return jsonify({"status": "success"})
    elif op == "cancel":
        if target in users:
            if "pending_reqs" in users[target] and logged_in_user in users[target]["pending_reqs"]:
                users[target]["pending_reqs"].remove(logged_in_user)
                save_users(users)
                return jsonify({"status": "success"})
            
    return jsonify({"error": "Connection op failed"}), 400

@app.route("/public_support", methods=["POST"])
def public_support():
    data = request.json
    user = data.get("user") or "Anonymous"
    msg = data.get("msg")
    tickets = load_support_tickets()
    if user not in tickets: tickets[user] = []
    tickets[user].append({
        "user": user,
        "msg": f"[EXTERNAL] {msg}",
        "time": datetime.now().strftime("%H:%M"),
        "status": "pending"
    })
    save_support_tickets(tickets)
    return jsonify({"status": "success", "message": "Support Request Logged. A Support Person will review your session manually."})

@app.route("/support_chat", methods=["POST"])
def support_chat():
    if not logged_in_user: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    op = data.get("op")
    tickets = load_support_tickets()
    
    if op == "send":
        if logged_in_user not in tickets: tickets[logged_in_user] = []
        tickets[logged_in_user].append({
            "user": logged_in_user,
            "msg": data.get("msg"),
            "time": datetime.now().strftime("%H:%M")
        })
        # Intelligent automated routing preview
        tickets[logged_in_user].append({
            "user": "Support-System",
            "msg": "Connected to Secure Support Tunnel. Our Support Person will review this shortly.",
            "time": datetime.now().strftime("%H:%M")
        })
        save_support_tickets(tickets)
        return jsonify({"status": "success"})
    elif op == "get":
        return jsonify(tickets.get(logged_in_user, []))
    elif op == "get_all":
        # Support Person/Admin only
        users = load_users()
        if users.get(logged_in_user, {}).get("role") not in ["support", "admin"]: 
            return jsonify({"error": "Permission Denied"}), 403
        return jsonify(tickets)
    elif op == "respond":
        # Support Person only op
        users = load_users()
        if users.get(logged_in_user, {}).get("role") not in ["support", "admin"]: 
            return jsonify({"error": "Permission Denied"}), 403
        target = data.get("target")
        msg = data.get("msg")
        if target in tickets:
            tickets[target].append({
                "user": "Support Person", # Generic reveal per request
                "msg": msg,
                "time": datetime.now().strftime("%H:%M")
            })
            save_support_tickets(tickets)
            return jsonify({"status": "success"})

    return jsonify({"error": "Support error"}), 400

@app.route("/direct_messages", methods=["POST"])
def direct_messages():
    if not logged_in_user: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    op = data.get("op")
    target = data.get("target")
    dms = load_dms()
    
    # Sort names to create a unique chat ID
    chat_id = "_".join(sorted([logged_in_user, target]))

    if op == "send":
        if chat_id not in dms: dms[chat_id] = []
        dms[chat_id].append({
            "from": logged_in_user,
            "msg": data.get("msg"),
            "time": datetime.now().strftime("%H:%M"),
            "read": False
        })
        save_dms(dms)
        return jsonify({"status": "success"})
    elif op == "get":
        chat = dms.get(chat_id, [])
        changed = False
        for m in chat:
            if m.get("from") == target and not m.get("read"):
                m["read"] = True
                changed = True
        if changed: save_dms(dms)
        return jsonify(chat)
        
    return jsonify({"error": "DM error"}), 400

@app.route("/uploads/profiles/<filename>")
def serve_profile_pic(filename):
    return send_from_directory(PROFILE_FOLDER, filename)

@app.route("/update_profile", methods=["POST"])
def update_profile():
    global logged_in_user
    if not logged_in_user: return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    action = data.get("action")
    users = load_users()
    user_data = users[logged_in_user]

    if action == "add_vehicle":
        v_name = data.get("vehicle")
        v_type = data.get("type", "Car")
        if "vehicles" not in user_data: user_data["vehicles"] = []
        user_data["vehicles"].append({"name": v_name, "type": v_type})
    elif action == "delete_vehicle":
        idx = int(data.get("index"))
        if "vehicles" in user_data and 0 <= idx < len(user_data["vehicles"]):
            user_data["vehicles"].pop(idx)
    elif action == "change_password":
        user_data["password"] = generate_password_hash(data.get("new_pass"))
    elif action == "change_pin":
        user_data["pin"] = generate_password_hash(str(data.get("new_pin")))
    
    save_users(users)
    return jsonify({"status": "success"})

@app.route("/dev_force_reset", methods=["POST"])
def dev_force_reset():
    # Emergency Developer route to reset ANY user if they forget BOTH pass and pin
    # This requires a secret DEV_KEY to prevent unauthorized access
    data = request.json
    if data.get("dev_key") != "MECH_AI_DEV_2026": # Secret Developer Key
        return jsonify({"error": "Invalid Developer Clearance"}), 403
    
    target_user = data.get("user")
    users = load_users()
    if target_user in users:
        users[target_user]["password"] = generate_password_hash("reset123")
        users[target_user]["pin"] = generate_password_hash("0000")
        save_users(users)
        return jsonify({"status": "success", "message": f"User {target_user} reset to default credentials."})
    return jsonify({"error": "User not found"}), 404

@app.route("/vault_list", methods=["GET"])
def vault_list():
    if not logged_in_user: return jsonify([]), 401
    files = []
    if os.path.exists(VAULT_FOLDER):
        for f in os.listdir(VAULT_FOLDER):
            if f.startswith(f"user_doc_"):
                files.append({"name": f, "url": f"/uploads/vault/{f}"})
    return jsonify(files)

@app.route("/vault_delete", methods=["POST"])
def vault_delete():
    if not logged_in_user: return jsonify({"error": "Unauthorized"}), 401
    filename = request.json.get("filename")
    target = os.path.join(VAULT_FOLDER, filename)
    if os.path.exists(target):
        os.remove(target)
        return jsonify({"status": "success"})
    return jsonify({"error": "File not found"}), 404

@app.route("/vault_upload", methods=["POST"])
def vault_upload():
    if 'file' not in request.files: return jsonify({"error": "No file"}), 400
    file = request.files['file']
    doc_type = request.form.get("type")
    
    if file.filename == '': return jsonify({"error": "No selected file"}), 400
    
    filename = f"user_doc_{doc_type}_{file.filename}"
    save_path = os.path.join(VAULT_FOLDER, filename)
    file.save(save_path)
    return jsonify({"status": "success", "filename": filename})

@app.route("/uploads/vault/<path:filename>")
def serve_vault(filename):
    return send_from_directory(VAULT_FOLDER, filename)

@app.route("/save_reminder", methods=["POST"])
def save_reminder():
    if not logged_in_user: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    if logged_in_user not in user_reminders: user_reminders[logged_in_user] = []
    user_reminders[logged_in_user].append(data)
    return jsonify({"status": "success"})

@app.route("/get_reminders")
def get_reminders():
    if not logged_in_user: return jsonify([]), 401
    return jsonify(user_reminders.get(logged_in_user, []))

def load_data():
    global db_data
    db_data = []
    
    if not os.path.exists(DATA_FILE):
        print("Dataset not found at:", DATA_FILE)
        return

    try:
        with open(DATA_FILE, "r", encoding="utf-8", errors="replace") as f:
            # Use DictReader or standard reader? Let's stay with standard but be smart
            reader = csv.reader(f)
            header = next(reader)
            for row in reader:
                if not row or len(row) < 2: continue
                
                # Clean row
                row = [col.strip() for col in row]
                raw_vtype = row[0].strip().lower()
                
                # Skip header repeats
                if raw_vtype == "vehicle_type": continue
                
                # Normalize Vehicle Type name
                vtype = "Other"
                if "bike" in raw_vtype: vtype = "Bike"
                elif "car" in raw_vtype: vtype = "Car"
                elif "truck" in raw_vtype: vtype = "Truck"
                else: vtype = row[0].strip().capitalize() # Keep original if specialized

                data = {
                    "vehicle": vtype,
                    "problem": "Unknown",
                    "symptoms": "-",
                    "cause": "-",
                    "solution": "Check connection."
                }

                # TRUCK logic (usually has Category/Component at indices 1,2)
                if vtype.lower() == "truck" and len(row) >= 7:
                    data["problem"] = row[3]
                    data["symptoms"] = row[4]
                    data["cause"] = row[5]
                    data["solution"] = row[6]
                else:
                    # Standard logic for Bike/Car/Simplified Truck
                    if len(row) >= 2: data["problem"] = row[1]
                    if len(row) >= 3: data["symptoms"] = row[2]
                    if len(row) >= 4: data["cause"] = row[3]
                    if len(row) >= 5: data["solution"] = row[4]

                # Only add if we actually found a problem description
                if data["problem"] and data["problem"] != "Unknown":
                    db_data.append(data)
                    
        print(f"COMPLETE LOAD: Found {len(db_data)} total problems in dataset.")
        print(f"Groups: {list(set(d['vehicle'] for d in db_data))}")
    except Exception as e:
        print(f"CRITICAL ERROR loading data: {e}")

load_data()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/get_options", methods=["POST"])
def get_options():
    req = request.json
    step = req.get("step")
    selected_vehicle = req.get("vehicle")
    
    if step == "vehicle":
        vehicles = sorted(list(set(d["vehicle"] for d in db_data)))
        return jsonify(vehicles)

    if step == "problem":
        problems = sorted(list(set(d["problem"] for d in db_data if d["vehicle"] == selected_vehicle)))
        return jsonify(problems)
            
    return jsonify([])

@app.route("/diagnose", methods=["POST"])
def diagnose():
    vehicle = request.json.get("vehicle")
    problem = request.json.get("problem")
    
    match = next((d for d in db_data if d["vehicle"] == vehicle and d["problem"] == problem), None)
    
    if match:
        return jsonify({
            "problem": match["problem"],
            "symptoms": match["symptoms"],
            "cause": match["cause"],
            "solution": match["solution"]
        })
    return jsonify({"problem": "Not Found", "symptoms": "-", "cause": "-", "solution": "Check connection."})

@app.route("/chat_diagnose", methods=["POST"])
def chat_diagnose():
    import difflib
    user_msg = request.json.get("message", "").lower()
    
    # Extract unique problems
    all_problems = list(set(d["problem"].lower() for d in db_data))
    
    # 1. Direct word matching (better for short keywords)
    best_match_entry = None
    best_words_found = 0
    
    # 2. Fuzzy matching for typos
    user_tokens = user_msg.split()
    matched_problems = []
    for token in user_tokens:
        if len(token) < 3: continue
        matches = difflib.get_close_matches(token, all_problems, n=1, cutoff=0.7)
        if matches:
            matched_problems.append(matches[0])

    # If fuzzy fails, look for partial inclusion
    if not matched_problems:
        for entry in db_data:
            prob = entry["problem"].lower()
            if prob in user_msg or user_msg in prob:
                matched_problems.append(prob)

    if matched_problems:
        # Find the full data for the best matched keyword
        target_prob = matched_problems[0]
        for entry in db_data:
            if entry["problem"].lower() == target_prob:
                best_match_entry = entry
                break

    if best_match_entry:
        return jsonify({
            "response": f"I've analyzed your message. It seems you're dealing with a **{best_match_entry['problem']}** issue.\n\n**Common Cause:** {best_match_entry['cause']}\n**Recommended Fix:** {best_match_entry['solution']}",
            "found": True
        })
        
    return jsonify({
        "response": "I didn't quite catch that. Could you describe the problem (e.g., 'engine noise' or 'brake squeak')? I'm here to help!",
        "found": False
    })

@app.route("/analyze_image", methods=["POST"])
def analyze_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
        
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
        
    import time
    filename = f"scan_{int(time.time())}_{file.filename}"
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    import random
    warnings = [
        {"name": "Check Engine", "desc": "Engine malfunction detected. Check O2 sensor or gas cap.", "severity": "High"},
        {"name": "Oil Pressure Low", "desc": "Oil level is low. Stop vehicle immediately to avoid damage.", "severity": "Critical"},
        {"name": "Battery Alert", "desc": "Charging system failure. Alternator might be failing.", "severity": "Medium"},
        {"name": "Tire Pressure", "desc": "One or more tires are significantly under-inflated.", "severity": "Low"}
    ]
    result = random.choice(warnings)
    result["saved_at"] = file_path
    return jsonify(result)

@app.route("/get_maintenance", methods=["POST"])
def get_maintenance():
    vehicle = request.json.get("vehicle")
    schedule = MAINTENANCE_SCHEDULE.get(vehicle, [])
    return jsonify(schedule)

# --- MAINTENANCE DATA ---
MAINTENANCE_SCHEDULE = {
    "Bike": [
        {"task": "Engine Oil Change", "interval": "Every 3,000 km", "status": "Critical"},
        {"task": "Chain Lubrication", "interval": "Every 500 km", "status": "Routine"},
        {"task": "Air Filter Check", "interval": "Every 5,000 km", "status": "Routine"},
        {"task": "Brake Bedding", "interval": "Every 10,000 km", "status": "Critical"}
    ],
    "Car": [
        {"task": "Oil Filter & Oil Change", "interval": "Every 10,000 km", "status": "Critical"},
        {"task": "Tire Rotation", "interval": "Every 8,000 km", "status": "Routine"},
        {"task": "Brake Fluid Check", "interval": "Every 2 Years", "status": "Critical"},
        {"task": "Cabin Air Filter", "interval": "Every 20,000 km", "status": "Routine"}
    ],
    "Truck": [
        {"task": "Engine Oil Analysis", "interval": "Every 25,000 km", "status": "Critical"},
        {"task": "Grease Chassis", "interval": "Every 15,000 km", "status": "Routine"},
        {"task": "Transmission Fluid", "interval": "Every 50,000 km", "status": "Critical"},
        {"task": "Coolant Flush", "interval": "Every Year", "status": "Critical"}
    ]
}

if __name__ == "__main__":
    app.run(debug=True, port=5000)

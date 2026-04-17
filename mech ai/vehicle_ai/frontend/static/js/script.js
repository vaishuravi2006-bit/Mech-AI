
// --- State & Initialization ---
let userLocation = null;
let currentQuery = "";
let threeScene, threeCamera, threeRenderer, vehicleModel;

window.onload = function () {
    console.log("MechAI System Initializing...");
    loadOptions('vehicle');
    getUserLocation();
    renderHistory();
    initThreeJS();
    initDemoData(); // Load professional demo data
    console.log("MechAI System Online.");
};

async function loadMaintenance() {
    const vehicle = document.getElementById('maintVehicleSelect').value;
    const grid = document.getElementById('maint-grid');
    if (!grid) return;

    try {
        const res = await fetch('/get_maintenance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehicle })
        });
        const data = await res.json();

        if (data.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">No schedule found for ${vehicle}.</p>`;
            return;
        }

        grid.innerHTML = data.map(item => `
            <div class="maint-card ${item.status.toLowerCase()}">
                <h3 style="margin: 0 0 10px 0; font-size: 1.1rem;">${item.task}</h3>
                <div style="font-size: 0.85rem; color: var(--text-muted);">INTERVAL: ${item.interval}</div>
                <div style="margin-top: 15px; font-size: 0.75rem; font-weight: 800; color: ${item.status === 'Critical' ? '#ff4b4b' : 'var(--primary)'}; uppercase">
                    ${item.status}
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error("Maintenance load error:", e);
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Connection Error.</p>`;
    }
}

function initDemoData() {
    // Add Demo Expenses
    const list = document.getElementById('expense-list');
    if (list && list.children.length === 0) {
        const demos = [
            { label: "Engine Oil Change", amount: 1500 },
            { label: "Full Body Wash", amount: 500 },
            { label: "Petrol Top-up", amount: 2000 }
        ];
        demos.forEach(d => {
            const item = document.createElement('div');
            item.className = 'expense-item';
            item.innerHTML = `<span class="expense-label">${d.label}</span><span class="expense-amount">₹${d.amount.toLocaleString()}</span>`;
            list.appendChild(item);
        });
    }

    // Trigger initial maintenance load
    loadMaintenance();

    // Professional modules initialized
    console.log("Professional modules initialized.");
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                console.log("Location fetched:", userLocation);
            },
            (err) => {
                console.warn("Geolocation failed, using default.");
                userLocation = null;
            },
            { timeout: 5000 }
        );
    }
}

// --- HISTORY LOGIC ---
function renderHistory() {
    const history = JSON.parse(localStorage.getItem('aurora_history') || '[]');
    const container = document.getElementById('history-list');
    if (!container) return;

    if (history.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); padding:10px;">No history found.</p>`;
        return;
    }

    container.innerHTML = history.map((item, idx) => `
        <div class="maint-card" style="padding: 15px; margin-bottom: 10px; cursor: pointer;" onclick="loadHistoryItem(${idx})">
            <h4 style="margin:0; font-size: 0.8rem;">${item.problem}</h4>
            <div style="font-size: 0.7rem; opacity: 0.6;">${item.vehicle} | ${item.date}</div>
        </div>
    `).join('');
}

function loadHistoryItem(idx) {
    const history = JSON.parse(localStorage.getItem('aurora_history') || '[]');
    const item = history[idx];
    if (item) {
        document.getElementById('res-problem').innerText = item.problem;
        document.getElementById('res-symptoms').innerText = item.symptoms;
        document.getElementById('res-cause').innerText = item.cause;
        document.getElementById('res-solution').innerText = item.solution;
        document.getElementById('result-container').classList.add('visible');
        highlightVehiclePart(0x00ff9c);
    }
}

// --- THREE JS ---
function initThreeJS() {
    const container = document.getElementById('three-container');
    if (!container) return;

    threeScene = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    threeRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(threeRenderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    threeScene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00ff9c, 2);
    pointLight.position.set(5, 5, 5);
    threeScene.add(pointLight);

    const geometry = new THREE.BoxGeometry(3, 1, 1.5);
    const material = new THREE.MeshPhongMaterial({ color: 0x333333, wireframe: true });
    vehicleModel = new THREE.Mesh(geometry, material);
    threeScene.add(vehicleModel);

    threeCamera.position.z = 5;

    function animate() {
        requestAnimationFrame(animate);
        vehicleModel.rotation.y += 0.005;
        threeRenderer.render(threeScene, threeCamera);
    }
    animate();
}

function highlightVehiclePart(color = 0xff4b6b) {
    if (vehicleModel) {
        vehicleModel.material.color.setHex(color);
        vehicleModel.material.wireframe = false;
        setTimeout(() => {
            vehicleModel.material.color.setHex(0x333333);
            vehicleModel.material.wireframe = true;
        }, 3000);
    }
}

// --- API ---
async function loadOptions(step, parentValue = null) {
    const payload = { step: step, vehicle: parentValue };
    try {
        const res = await fetch('/get_options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        const selId = step === 'vehicle' ? 'vehicleSelect' : 'problemSelect';
        const sel = document.getElementById(selId);
        if (!sel) return;

        sel.innerHTML = '<option value="" disabled selected>Select...</option>';
        sel.disabled = false;

        data.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.innerText = item;
            sel.appendChild(opt);
        });
    } catch (e) { console.error("Error loading options:", e); }
}

function onVehicleChange() {
    const vehicle = document.getElementById('vehicleSelect').value;
    document.getElementById('problemSelect').innerHTML = '<option>Loading problems...</option>';
    loadOptions('problem', vehicle);
}

async function diagnose() {
    const vehicle = document.getElementById('vehicleSelect').value;
    const problem = document.getElementById('problemSelect').value;
    if (!vehicle || !problem) { alert("Please select both field."); return; }

    const btn = document.querySelector('.btn-primary');
    const loader = document.getElementById('loader');
    if (btn) btn.disabled = true;
    if (loader) loader.style.display = 'inline-block';

    try {
        const res = await fetch('/diagnose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehicle, problem })
        });
        const data = await res.json();

        document.getElementById('res-problem').innerText = data.problem;
        document.getElementById('res-symptoms').innerText = data.symptoms;
        document.getElementById('res-cause').innerText = data.cause;
        document.getElementById('res-solution').innerText = data.solution;
        document.getElementById('result-container').classList.add('visible');

        // Professional Price Comparison logic
        document.getElementById('ai-rec').style.display = 'inline-flex';
        document.getElementById('cost-box').style.display = 'block';

        const baseCost = Math.floor(Math.random() * 3000) + 1000;
        const onlinePrice = baseCost - Math.floor(Math.random() * 500);
        const oemPrice = baseCost + Math.floor(Math.random() * 2000);
        const estRepair = Math.floor((onlinePrice + oemPrice) / 2) + 500;

        document.getElementById('price-online').innerText = `₹${onlinePrice.toLocaleString()}`;
        document.getElementById('price-oem').innerText = `₹${oemPrice.toLocaleString()}`;
        document.getElementById('res-cost').innerText = `₹${estRepair.toLocaleString()}`;

        updateQuickSummary();
        const history = JSON.parse(localStorage.getItem('aurora_history') || '[]');
        history.unshift({ ...data, vehicle, date: new Date().toLocaleDateString() });
        localStorage.setItem('aurora_history', JSON.stringify(history.slice(0, 5)));
        renderHistory();

    } catch (e) { console.error("Diagnosis error:", e); }
    finally {
        if (btn) btn.disabled = false;
        if (loader) loader.style.display = 'none';
    }
}


// --- MAP LOGIC ---
function switchTab(tabName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (event) event.currentTarget.classList.add('active');

    document.querySelectorAll('.view-section').forEach(sec => {
        sec.classList.remove('active');
        sec.style.display = 'none';
    });

    const target = document.getElementById('tab-' + tabName);
    target.style.display = (tabName === 'diagnosis' ? 'flex' : 'block');
    setTimeout(() => target.classList.add('active'), 10);

    if (tabName === 'profile') loadProfile();
    if (tabName === 'documents') loadVaultFiles();
    if (tabName === 'maintenance') loadReminders();
    if (tabName === 'expenses') loadExpenses();
    if (tabName === 'community') {
        loadCommunityMsgs();
        searchCommunity(""); // Load initial users
        loadPendingRequests();
    }
    if (tabName === 'map') {
        const query = userLocation ? `${userLocation.lat},${userLocation.lng}` : "New Delhi";
        document.getElementById('nav_gmap_canvas').src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
    }
}

function findNearby(category) {
    const vehicle = document.getElementById('vehicleSelect').value || "Vehicle";
    let queryTerm = category === 'mechanic' ? `${vehicle} mechanic` : `${vehicle} spare parts`;
    let query = userLocation ? `${queryTerm} near ${userLocation.lat},${userLocation.lng}` : `${queryTerm} near me`;

    const iframe = document.getElementById('gmap_canvas');
    iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
    iframe.style.opacity = "1";
    document.getElementById('three-container').style.opacity = "0.2";
}

function findGoogleMap(type) {
    const vehicle = document.getElementById('navVehicleSelect').value;
    let queryTerm = type === 'fuel' ? "fuel station" : (type === 'mechanic' ? `${vehicle} mechanic` : `${vehicle} spare parts`);
    let query = userLocation ? `${queryTerm} near ${userLocation.lat},${userLocation.lng}` : `${queryTerm} near me`;
    document.getElementById('nav_gmap_canvas').src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
}

// --- CHAT ---
async function sendChat() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    addMessage(msg, 'user');
    input.value = '';
    try {
        const res = await fetch('/chat_diagnose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        addMessage(data.response, 'bot');
    } catch (e) { addMessage("Connection error.", 'bot'); }
}

function addMessage(text, sender) {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    div.className = `message msg-${sender}`;
    div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    if (history) {
        history.appendChild(div);
        history.scrollTop = history.scrollHeight;
    }
}

// --- AUTHENTICATION ---
let authMode = 'login';
function toggleAuth() {
    authMode = authMode === 'login' ? 'signup' : 'login';
    document.getElementById('auth-title').innerText = authMode === 'login' ? 'Secure Portal Login' : 'Create New Account';
    document.getElementById('auth-toggle-text').innerText = authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login";
    document.getElementById('auth-recovery-box').style.display = authMode === 'login' ? 'none' : 'block';
}

async function handleAuth() {
    const user = document.getElementById('auth-user').value;
    const pass = document.getElementById('auth-pass').value;
    const pin = document.getElementById('auth-recovery').value;

    if (!user || !pass) return alert("Please enter credentials");
    if (authMode === 'signup' && (!pin || pin.length !== 4)) return alert("Please set a 4-digit Recovery Pin.");

    const res = await fetch('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: authMode, user, pass, pin })
    });

    if (res.ok) {
        const data = await res.json();
        document.getElementById('auth-overlay').style.display = 'none';
        alert(`Access Granted. Welcome ${data.user}. Secure data bridge established.`);
        loadProfile();
        checkReminders();
    } else {
        const err = await res.json();
        alert(err.message || "Authentication failed. Invalid clearance.");
    }
}

function showResetOverlay() { document.getElementById('reset-overlay').style.display = 'flex'; }
function hideResetOverlay() { document.getElementById('reset-overlay').style.display = 'none'; }

async function handleReset() {
    const user = document.getElementById('reset-user').value;
    const pin = document.getElementById('reset-pin').value;
    const new_pass = document.getElementById('reset-new-pass').value;

    if (!user || !pin || !new_pass) return alert("Please fill all fields for verification.");

    const res = await fetch('/reset_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pin, new_pass })
    });

    if (res.ok) {
        alert("Your password has been securely reset. You can now login.");
        hideResetOverlay();
        authMode = 'login';
        toggleAuth(); // Set UI to login
    } else {
        const err = await res.json();
        alert(err.message || "Reset failed. Security Pin or Username incorrect.");
    }
}

// --- VAULT UPLOAD ---
async function vaultUpload(type) {
    const fileInput = document.getElementById(`up-${type}`);
    if (!fileInput.files.length) return;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('type', type);

    const res = await fetch('/vault_upload', {
        method: 'POST',
        body: formData
    });

    if (res.ok) {
        document.getElementById(`st-${type}`).innerText = "SECURED";
        document.getElementById(`st-${type}`).classList.add('active');
        loadVaultFiles();
        updateQuickSummary();
        alert(`${type.toUpperCase()} successfully uploaded to encrypted vault.`);
    }
}

async function loadVaultFiles() {
    const res = await fetch('/vault_list');
    const allFiles = await res.json();
    const filter = document.getElementById('vaultVehicleFilter')?.value || 'All';
    const grid = document.getElementById('vault-files-grid');
    if (!grid) return;

    const files = allFiles.filter(f => {
        if (filter === 'All') return true;
        // Check if the filename contains the vehicle type (assuming the dropdown choice in index.html)
        return f.name.toLowerCase().includes(filter.toLowerCase());
    });

    grid.innerHTML = files.map(f => `
        <div class="doc-card" style="padding: 10px;">
            <span class="material-icons-round" style="color: var(--primary);">description</span>
            <p style="font-size: 0.7rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;">${f.name.replace('user_doc_', '')}</p>
            <div style="display: flex; gap: 5px; margin-top: 5px;">
                <button class="btn-secondary" style="font-size: 0.6rem; padding: 5px;" onclick="window.open('${f.url}')">VIEW</button>
                <button class="btn-secondary" style="font-size: 0.6rem; padding: 5px; border-color: #ff4b4b; color: #ff4b4b;" onclick="deleteVaultFile('${f.name}')">DEL</button>
            </div>
        </div>
    `).join('');
}

async function deleteVaultFile(filename) {
    if (!confirm("Delete this document forever?")) return;
    const res = await fetch('/vault_delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
    });
    if (res.ok) {
        loadVaultFiles();
        updateQuickSummary();
    }
}

async function loadProfile() {
    const res = await fetch('/get_user_profile');
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById('prof-user').innerText = data.username;
    document.getElementById('prof-joined').innerText = `Member Since: ${data.joined}`;
    updatePicUI(data.pic_url);

    // Vehicles
    const vehList = document.getElementById('prof-vehicle-list');
    const vehCount = document.getElementById('prof-veh-count');
    if (vehList) {
        if (!data.vehicles || data.vehicles.length === 0) {
            vehList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No vehicles added yet.</p>';
        } else {
            vehList.innerHTML = data.vehicles.map((v, idx) => {
                let icon = 'directions_car';
                if (v.type === 'Bike') icon = 'pedal_bike';
                if (v.type === 'Truck') icon = 'local_shipping';
                return `
                    <div class="expense-item" style="padding: 10px; border-left: 3px solid var(--secondary);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="material-icons-round" style="font-size: 1.2rem; color: var(--secondary);">${icon}</span>
                            <span>${v.name || v}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">${v.type || 'Car'}</span>
                            <span class="material-icons-round" style="font-size: 1.1rem; color: #ff4b4b; cursor: pointer;" onclick="updateProfile('delete_vehicle', ${idx})">delete</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
    if (vehCount) vehCount.innerText = data.vehicles ? data.vehicles.length : 0;

    // Docs
    document.getElementById('prof-docs').innerText = data.docs_count;
    document.getElementById('summ-docs').innerText = `${data.docs_count} / 3`;
    if (document.getElementById('prof-garage-count')) document.getElementById('prof-garage-count').innerText = data.garage_count || 0;

    // Connections/Friends
    loadConnections();
    loadJoinedGarages();
    loadExpenses();
    updateQuickSummary();

    // Support Role check
    const spBtn = document.getElementById('btn-support-portal');
    if (spBtn) {
        if (data.role === 'support' || data.role === 'admin') spBtn.style.display = 'block';
        else spBtn.style.display = 'none';
    }

    // Update summary
    if (document.getElementById('summ-garages')) document.getElementById('summ-garages').innerText = data.garage_count || 0;
}

async function updateProfile(action, dataVal) {
    let payload = { action };

    if (action === 'add_vehicle') {
        const v = document.getElementById('prof-veh-name').value;
        const t = document.getElementById('prof-veh-type').value;
        if (!v) return alert("Enter vehicle name");
        payload.vehicle = v;
        payload.type = t;
    } else if (action === 'delete_vehicle') {
        if (!confirm("Remove this vehicle from fleet?")) return;
        payload.index = dataVal;
    } else if (action === 'change_password') {
        const p = document.getElementById('prof-new-pass').value;
        if (!p) return alert("Enter new password");
        payload.new_pass = p;
    } else if (action === 'change_pin') {
        const pi = document.getElementById('prof-new-pin').value;
        if (!pi || pi.length !== 4) return alert("Enter 4-digit pin");
        payload.new_pin = pi;
    }

    const res = await fetch('/update_profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert("Profile updated successfully!");
        if (action === 'add_vehicle') document.getElementById('prof-veh-name').value = '';
        if (action === 'change_password') document.getElementById('prof-new-pass').value = '';
        if (action === 'change_pin') document.getElementById('prof-new-pin').value = '';
        loadProfile();
    }
}

async function addReminder() {
    const label = document.getElementById('remLabel').value;
    const date = document.getElementById('remDate').value;
    if (!label || !date) return alert("Fill all fields");

    await fetch('/save_reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, date })
    });
    loadReminders();
    checkReminders();
}

async function loadReminders() {
    const res = await fetch('/get_reminders');
    const data = await res.json();
    const list = document.getElementById('reminders-list');
    if (!list) return;

    list.innerHTML = data.map(r => `
        <div class="expense-item" style="border-left: 3px solid var(--primary);">
            <span>${r.label}</span>
            <span style="color: var(--text-muted); font-size: 0.8rem;">DUE: ${r.date}</span>
        </div>
    `).reverse().join('');
}

async function sendCommunityMsg() {
    const input = document.getElementById('comm-msg-input');
    const msg = input.value.trim();
    if (!msg) return;

    const res = await fetch('/send_community_msg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg })
    });
    if (res.ok) {
        input.value = '';
        setTimeout(loadCommunityMsgs, 500); // Small delay to ensure DB write
    }
}

async function loadCommunityMsgs() {
    const res = await fetch('/get_community_msgs');
    const data = await res.json();
    const box = document.getElementById('comm-chat-box');
    if (!box) return;

    box.innerHTML = data.map(m => `
        <div style="margin-bottom: 10px; font-size: 0.85rem;">
            <b style="color: var(--secondary); cursor: pointer;" onclick="openPublicProfile('${m.user}')">${m.user}:</b> ${m.msg}
            <span style="font-size: 0.6rem; color: var(--text-muted); float: right;">${m.time}</span>
        </div>
    `).join('');
    box.scrollTop = box.scrollHeight;
}

async function searchCommunity() {
    const input = document.getElementById('comm-search');
    const query = input ? input.value : "";

    const res = await fetch('/search_community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });
    const data = await res.json();
    const list = document.getElementById('comm-user-list');
    if (!list) return;

    if (data.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.75rem;">No new users found or they are already your friends.</p>';
        return;
    }

    list.innerHTML = data.map(u => `
        <div class="expense-item" style="padding: 10px; border-left: 2px solid var(--secondary); justify-content: space-between; display: flex; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="openPublicProfile('${u.username}')">
                <span class="material-icons-round" style="color: var(--secondary);">person</span>
                <div>
                    <div style="font-size: 0.85rem; font-weight: bold;">${u.username}</div>
                    <div style="font-size: 0.6rem; color: var(--text-muted);">Joined: ${u.joined}</div>
                </div>
            </div>
            ${u.is_friend ?
            `<span style="font-size:0.6rem; color:var(--primary); font-weight:bold;">CONNECTED</span>` :
            (u.is_pending_sent ?
                `<div style="display:flex; flex-direction:column; align-items:flex-end; gap:3px;">
                    <span style="font-size:0.6rem; color:var(--secondary); font-weight:bold;">SENT</span>
                    <button class="btn-secondary" style="font-size:0.5rem; padding:2px 6px; width:auto; border-color:#ff4b4b; color:#ff4b4b;" onclick="cancelConnectionRequest('${u.username}')">CANCEL</button>
                </div>` :
                `<button class="btn-primary" style="width: auto; padding: 5px 15px; font-size: 0.7rem;" onclick="sendConnectionRequest('${u.username}')">CONNECT</button>`)
        }
        </div>
    `).join('');
}

// --- ADVANCED SOCIAL & ENCRYPTION ---
async function uploadProfilePic() {
    const fileInput = document.getElementById('prof-pic-input');
    if (!fileInput.files.length) return;
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    const res = await fetch('/upload_profile_pic', { method: 'POST', body: formData });
    if (res.ok) {
        const data = await res.json();
        updatePicUI(data.url);
    }
}

function updatePicUI(url) {
    if (url) {
        document.getElementById('prof-pic-display').style.backgroundImage = `url(${url})`;
        document.getElementById('prof-pic-icon').style.display = 'none';
    }
}

async function openPublicProfile(username) {
    const res = await fetch('/get_public_profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });
    if (res.ok) {
        const data = await res.json();
        document.getElementById('pub-user').innerText = data.username;
        document.getElementById('pub-joined').innerText = `Joined: ${data.joined}`;
        document.getElementById('pub-pic').style.backgroundImage = data.pic_url ? `url(${data.pic_url})` : '';
        document.getElementById('pub-friends').innerText = `Friends: ${data.friend_count || 0}`;
        document.getElementById('pub-vehicles').innerHTML = (data.vehicles || []).map(v => `<div class='expense-item' style='font-size:0.7rem; padding:5px;'>${v.name} (${v.type})</div>`).join('');

        const actionBtn = document.getElementById('pub-action-btn');
        if (data.is_friend) {
            actionBtn.innerText = "MESSAGE";
            actionBtn.onclick = () => { closePublicProfile(); openDM(data.username); };
            actionBtn.style.background = "var(--primary)";
        } else if (data.is_pending_sent) {
            actionBtn.innerText = "CANCEL REQUEST";
            actionBtn.onclick = () => { cancelConnectionRequest(data.username); closePublicProfile(); };
            actionBtn.style.background = "#ff4b4b";
        } else {
            actionBtn.innerText = "CONNECT";
            actionBtn.onclick = () => sendConnectionRequest(data.username);
            actionBtn.style.background = "var(--primary)";
        }

        document.getElementById('public-profile-overlay').style.display = 'flex';
    }
}

function closePublicProfile() { document.getElementById('public-profile-overlay').style.display = 'none'; }

let activeGarage = null;
async function garageOp(op, target = null, extra = null) {
    const payload = { op };
    if (op === 'create') payload.name = document.getElementById('garage-name').value;
    if (op === 'request') {
        const inputId = document.getElementById('garage-id-input').value;
        payload.id = target || inputId;
    }
    if (op === 'search') {
        payload.query = document.getElementById('garage-search-input').value;
    }
    if (op === 'accept' || op === 'promote' || op === 'set_role') {
        if (op === 'set_role') {
            if (!confirm(`Are you sure you want to assign the role of '${extra}' to ${target}?`)) return;
        }
        if (op === 'promote') {
            if (!confirm(`Are you sure you want to promote ${target} to Garage Admin?`)) return;
        }
        payload.id = activeGarage;
        payload.target = target;
        if (extra) payload.role = extra;
    }
    if (op === 'invite') {
        payload.id = extra || activeGarage;
        payload.target = target;
    }
    if (op === 'send_msg') {
        payload.id = activeGarage;
        payload.msg = btoa(document.getElementById('garage-msg-input').value);
    }
    if (op === 'accept_role' || op === 'reject_role') {
        payload.id = activeGarage;
    }

    const res = await fetch('/garage_ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
        if (op === 'create') { alert(`Garage Created! ID: ${data.id}`); activeGarage = data.id; }
        if (op === 'request') { alert("Join request transmitted to Garage Admins."); return; }
        if (op === 'invite') { alert(`Invitation sent to ${target}. Admin must approve.`); }
        if (op === 'search') {
            const resultsBox = document.getElementById('garage-search-results');
            if (data.length === 0) {
                resultsBox.innerHTML = '<p style="color:var(--text-muted); font-size:0.75rem;">No garages found.</p>';
            } else {
                resultsBox.innerHTML = data.map(g => `
                    <div class="expense-item" style="padding:8px; font-size:0.75rem; justify-content:space-between; display:flex; align-items:center;">
                        <div>
                            <b>${g.name}</b> <br> <span style="font-size:0.6rem; opacity:0.6;">REF: ${g.id} | ${g.members} Members</span>
                        </div>
                        ${g.is_member ? `<span style="color:var(--primary); font-weight:bold;">JOINED GARAGE</span>` :
                        (g.is_pending ? `<span style="color:var(--secondary);">PENDING</span>` :
                            `<button onclick="garageOp('request', '${g.id}')" class="btn-primary" style="width:auto; padding:3px 10px; font-size:0.6rem;">JOIN</button>`)}
                    </div>
                `).join('');
            }
            return;
        }
        if (op === 'send_msg') document.getElementById('garage-msg-input').value = '';

        loadGarageData();
        loadJoinedGarages();
        loadProfile(); // Refresh counters on diagnosis/profile tabs
    } else {
        const err = await res.json();
        alert(err.error || "Garage operation failed");
    }
}

async function loadJoinedGarages() {
    const res = await fetch('/garage_ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'get_joined' })
    });
    if (!res.ok) return;
    const data = await res.json();
    const list = document.getElementById('joined-garages-list');
    if (!list) return;

    if (data.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.75rem;">You haven\'t joined any garages yet.</p>';
        return;
    }

    list.innerHTML = data.map(g => `
        <div class="expense-item" style="padding:10px; border-left: 2px solid var(--primary); justify-content: space-between; display: flex; align-items: center;">
            <div style="cursor: pointer;" onclick="selectGarage('${g.id}')">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <b style="font-size: 0.85rem; color: var(--primary);">${g.name}</b>
                    ${g.unread > 0 ? `<span style="background:#ff4b4b; color:white; border-radius:10px; padding:2px 6px; font-size:0.6rem; font-weight:bold;">${g.unread}</span>` : ''}
                </div>
                <div style="font-size: 0.65rem; color: var(--text-muted);">Role: ${g.role} | Members: ${g.members_count}</div>
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="btn-primary" style="width: auto; padding: 4px 10px; font-size: 0.6rem;" onclick="selectGarage('${g.id}')">
                    ${activeGarage === g.id ? 'ACTIVE' : 'OPEN CHAT'}
                </button>
            </div>
        </div>
    `).join('');
}

function selectGarage(id) {
    activeGarage = id;
    loadGarageData().then(() => {
        loadJoinedGarages(); // Refresh to clear unread badge after data is fetched
    });
}

async function loadGarageData() {
    if (!activeGarage) return;
    const res = await fetch('/garage_ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'get_info', id: activeGarage })
    });
    const g = await res.json();

    document.getElementById('garage-chat').style.display = 'block';
    document.getElementById('curr-garage-title').innerText = g.name + ` (ID: ${activeGarage})`;

    // Render Messages
    const currentUser = document.getElementById('prof-user').innerText;
    const msgBox = document.getElementById('garage-msg-box');
    msgBox.innerHTML = g.messages.map(m => {
        const isMe = m.user === currentUser;
        return `
        <div style="margin-bottom:8px; text-align: ${isMe ? 'right' : 'left'};">
            <b style="color:var(--primary);">${m.user} ${isMe ? '(You)' : ''}</b> 
            <span style="font-size:0.6rem; opacity:0.6;">[${m.role}]</span>: 
            <div style="display:inline-block; background: ${isMe ? 'rgba(0,255,156,0.1)' : 'rgba(255,255,255,0.05)'}; padding: 5px 10px; border-radius: 8px;">
                ${atob(m.msg)}
            </div>
            <div style="font-size:0.5rem; color:#00ff9c; margin-top:2px;">🔐 Encrypted</div>
        </div>`;
    }).join('');
    msgBox.scrollTop = msgBox.scrollHeight;

    // Render Admin Tools (Pending & Members)
    const isAdmin = g.admins.includes(document.getElementById('prof-user').innerText);
    const adminPanel = document.getElementById('garage-admin-tools');
    if (adminPanel) {
        adminPanel.innerHTML = "";
        if (isAdmin && g.pending.length > 0) {
            adminPanel.innerHTML += `<h4 style="font-size:0.75rem; margin-top:10px;">Pending Requests:</h4>`;
            g.pending.forEach(p => {
                adminPanel.innerHTML += `
                <div class="expense-item" style="padding:5px; font-size:0.7rem;">
                    ${p} <button onclick="garageOp('accept', '${p}')" class="btn-primary" style="width:auto; padding:2px 8px; font-size:0.6rem;">ACCEPT</button>
                </div>`;
            });
        }

        adminPanel.innerHTML += `<h4 style="font-size:0.75rem; margin-top:10px;">Operational Unit:</h4>`;
        const isFounder = g.roles[document.getElementById('prof-user').innerText] === "Founder";
        g.members.forEach(m => {
            let role = g.roles[m] || "Member";
            let tools = isFounder && m !== document.getElementById('prof-user').innerText ? `
                <select onchange="garageOp('set_role', '${m}', this.value)" style="font-size:0.6rem; padding:2px; background:#222; color:white;">
                    <option value="">Set Role...</option>
                    <option value="Driver">Driver</option>
                    <option value="Mechanic">Mechanic</option>
                    <option value="Navigator">Navigator</option>
                </select>
                <button onclick="garageOp('promote', '${m}')" class="btn-secondary" style="width:auto; padding:2px 8px; font-size:0.5rem;">PROMOTE</button>
            ` : "";
            adminPanel.innerHTML += `
                <div class="expense-item" style="padding:5px; font-size:0.7rem; display:flex; justify-content:space-between; align-items:center;">
                    <span>${m} (${role})</span>
                    <div style="display:flex; gap:5px;">${tools}</div>
                </div>`;
        });
    }

    // Role Confirmation UI
    const pendingRoles = g.pending_roles || {};
    const roleNotice = document.getElementById('garage-role-notice');
    if (roleNotice) {
        if (pendingRoles[currentUser]) {
            roleNotice.innerHTML = `
                <div style="background: var(--primary); color: black; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                    <span>New Role Assigned: ${pendingRoles[currentUser]}</span>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="garageOp('accept_role')" class="btn-secondary" style="background:white; color:black; border:none; padding:5px 10px; font-size:0.6rem;">CONFIRM</button>
                        <button onclick="garageOp('reject_role')" class="btn-secondary" style="background:#ff4b4b; color:white; border:none; padding:5px 10px; font-size:0.6rem;">REJECT</button>
                    </div>
                </div>
            `;
            roleNotice.style.display = 'block';
        } else {
            roleNotice.style.display = 'none';
        }
    }
}

async function checkReminders() {
    const res = await fetch('/get_reminders');
    const data = await res.json();
    const today = new Date();
    let pending = 0;

    data.forEach(r => {
        const d = new Date(r.date);
        const diff = (d - today) / (1000 * 60 * 60 * 24);
        if (diff >= 0 && diff <= 7) pending++;
    });

    const badge = document.getElementById('notif-badge');
    if (pending > 0) {
        badge.style.display = 'block';
        alert(`NOTICE: You have ${pending} important dates nearing! Check Maintenance Tab.`);
    } else {
        badge.style.display = 'none';
    }
}

function updateQuickSummary() {
    const user = document.getElementById('prof-user').innerText;
    const storageKey = `aurora_expenses_${user}`;
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    let totalSpend = history.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);

    if (document.getElementById('summ-spend')) {
        document.getElementById('summ-spend').innerText = `₹${totalSpend.toLocaleString()}`;
    }

    fetch('/get_reminders').then(res => res.json()).then(data => {
        if (data.length > 0) {
            document.getElementById('summ-service').innerText = data[data.length - 1].date;
        }
    });
}

function triggerSOS() {
    const confirmSOS = confirm("🚨 EMERGENCY SOS INITIATED 🚨\n\nThis will instantly broadcast your GPS coordinates to Roadside Assistance and Emergency Services. Are you sure you wish to proceed?");
    if (confirmSOS) {
        const coords = userLocation ? `${userLocation.lat}, ${userLocation.lng}` : "Locating...";
        alert("SOS TRANSMITTED!\n\nLocation: " + coords + "\nDispatch: On the way. Stay near your vehicle.");
    }
}

function addExpense() {
    const user = document.getElementById('prof-user').innerText;
    const label = document.getElementById('expLabel');
    const amount = document.getElementById('expAmount');
    const type = document.getElementById('expVehicleType').value;
    if (!label.value || !amount.value) return;

    if (!confirm(`CONFIRM ENTRY:\n\nPurpose: ${label.value}\nAmount: ₹${parseFloat(amount.value).toLocaleString()}\nVehicle: ${type}\n\nProceed to save?`)) return;

    const storageKey = `aurora_expenses_${user}`;
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    history.unshift({ label: label.value, amount: amount.value, type, date: new Date().toLocaleDateString() });
    localStorage.setItem(storageKey, JSON.stringify(history));

    label.value = '';
    amount.value = '';
    loadExpenses();
}

function deleteExpense(index) {
    const user = document.getElementById('prof-user').innerText;
    if (!confirm("Are you sure you want to remove this expense entry?")) return;
    const storageKey = `aurora_expenses_${user}`;
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    history.splice(index, 1);
    localStorage.setItem(storageKey, JSON.stringify(history));
    loadExpenses();
}

function loadExpenses() {
    const user = document.getElementById('prof-user').innerText;
    const filter = document.getElementById('expVehicleType').value;
    const storageKey = `aurora_expenses_${user}`;
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const list = document.getElementById('expense-list');
    if (!list) return;

    const filtered = history.filter(e => filter === 'All' || e.type === filter);
    let filterTotal = 0;

    list.innerHTML = filtered.map((item, idx) => {
        filterTotal += parseFloat(item.amount) || 0;
        let icon = 'directions_car';
        if (item.type === 'Bike') icon = 'pedal_bike';
        if (item.type === 'Truck') icon = 'local_shipping';

        return `
        <div class="expense-item" style="padding: 12px; border-left: 4px solid var(--primary); margin-bottom: 10px; background: rgba(255,255,255,0.03);">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <span class="material-icons-round" style="color: var(--secondary); font-size: 1.4rem;">${icon}</span>
                <div style="display: flex; flex-direction: column;">
                    <span class="expense-label" style="font-weight: bold; font-size: 0.95rem; color: #fff;">${item.label}</span>
                    <span style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">${item.type} CATEGORY | ${item.date}</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="text-align: right;">
                    <div style="font-size: 0.6rem; color: var(--primary); opacity: 0.8; margin-bottom: -2px;">AMOUNT</div>
                    <span class="expense-amount" style="font-weight: 900; color: var(--primary); font-size: 1.1rem;">₹${parseFloat(item.amount).toLocaleString()}</span>
                </div>
                <span class="material-icons-round" style="color: #ff4b4b; cursor: pointer; font-size: 1.3rem; opacity: 0.7; hover:opacity:1;" onclick="deleteExpense(${idx})">delete_forever</span>
            </div>
        </div>
    `}).join('');

    // Add Total Summary for the filter
    if (filtered.length > 0) {
        list.innerHTML += `
            <div style="margin-top: 20px; padding: 15px; background: var(--primary); color: #000; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; font-weight: bold; box-shadow: 0 4px 15px rgba(0,255,156,0.2);">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 0.7rem; opacity: 0.7; text-transform: uppercase;">Total for ${filter === 'All' ? 'All Vehicles' : filter}</span>
                    <span style="font-size: 1.1rem;">CONSULATED TOTAL</span>
                </div>
                <span style="font-size: 1.4rem; font-weight: 900;">₹${filterTotal.toLocaleString()}</span>
            </div>
        `;
    } else {
        list.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px;">No expenses logged for ${filter}.</p>`;
    }

    updateQuickSummary();
}

// --- CONNECTIONS & SUPPORT ---
async function sendConnectionRequest(userOverride = null) {
    const target = userOverride || document.getElementById('pub-user').innerText;
    const res = await fetch('/connection_ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'send', target })
    });
    if (res.ok) {
        alert('Connection Request Received by ' + target);
        if (!userOverride) closePublicProfile();
        searchCommunity(); // Refresh search list to show SENT status
    }
}

async function cancelConnectionRequest(target) {
    if (!confirm(`Cancel your pending request to ${target}?`)) return;
    const res = await fetch('/connection_ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'cancel', target })
    });
    if (res.ok) {
        searchCommunity();
    }
}

async function loadPendingRequests() {
    const res = await fetch('/connection_ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'get_pending' })
    });
    if (!res.ok) return;
    const data = await res.json();
    const list = document.getElementById('comm-request-list');
    if (!list) return;

    if (data.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.75rem;">No pending requests.</p>';
        return;
    }

    list.innerHTML = data.map(user => `
        <div class="expense-item" style="padding: 10px; border-left: 2px solid var(--secondary); justify-content: space-between; display: flex; align-items: center;">
            <span style="font-size: 0.8rem;">${user}</span>
            <div style="display: flex; gap: 5px;">
                <button class="btn-primary" style="font-size: 0.6rem; padding: 4px 8px; width: auto;" onclick="handleRequest('accept', '${user}')">ACCEPT</button>
                <button class="btn-secondary" style="font-size: 0.6rem; padding: 4px 8px; background: #ff4b4b; border:none; width: auto;" onclick="handleRequest('reject', '${user}')">REJECT</button>
            </div>
        </div>`).join('');
}

async function handleRequest(op, target) {
    await fetch('/connection_ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op, target })
    });
    loadPendingRequests();
}

function openSupport() {
    document.getElementById('support-overlay').style.display = 'flex';
    loadSupportMsgs();
}
function closeSupport() { document.getElementById('support-overlay').style.display = 'none'; }

async function sendSupport() {
    const input = document.getElementById('support-input');
    const msg = input.value.trim();
    if (!msg) return;

    await fetch('/support_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'send', msg })
    });
    input.value = '';
    loadSupportMsgs();
}

async function loadSupportMsgs() {
    const res = await fetch('/support_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'get' })
    });
    if (!res.ok) return;
    const data = await res.json();
    const box = document.getElementById('support-msgs');
    if (!box) return;

    box.innerHTML = data.map(m => `
        <div style="margin-bottom: 10px; text-align: ${m.user === 'Support-AI' ? 'left' : 'right'};">
            <div style="display:inline-block; padding: 8px 12px; border-radius: 12px; background: ${m.user === 'Support-AI' ? 'rgba(255,255,255,0.1)' : 'var(--secondary)'};">${m.msg}</div>
            <div style="font-size: 0.6rem; opacity: 0.5; margin-top: 3px;">${m.time}</div>
        </div>`).join('');
    box.scrollTop = box.scrollHeight;
}

async function loadConnections() {
    const res = await fetch('/connection_ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'get_friends' })
    });
    const data = await res.json();
    const list = document.getElementById('prof-friend-list');
    if (!list) return;

    if (data.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem;">Build your circle to start secure garages.</p>';
        return;
    }

    const resG = await fetch('/garage_ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'get_joined' })
    });
    const myGars = await resG.json();
    const adminGars = myGars.filter(g => g.role === 'Founder' || g.role === 'Admin');

    list.innerHTML = data.map(friend => {
        // Find garages where I am an admin AND this friend is NOT a member
        const invitableGarages = adminGars.filter(g => !g.members.includes(friend.username));

        const showInvite = invitableGarages.length > 0;

        return `
        <div class="expense-item" style="padding: 10px; border-left: 2px solid var(--primary); justify-content: space-between; display: flex; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px; cursor: pointer;" onclick="openPublicProfile('${friend.username}')">
                <span class="material-icons-round" style="font-size: 1rem; color: var(--secondary);">person</span>
                <span style="font-size: 0.85rem; font-weight: bold;">${friend.username}</span>
                ${friend.unread > 0 ? `<span style="background:#ff4b4b; color:white; border-radius:10px; padding:2px 6px; font-size:0.6rem; font-weight:bold;">${friend.unread}</span>` : ''}
            </div>
            <div style="display: flex; gap: 5px; align-items: center;">
                ${showInvite ? `<button class="btn-secondary" style="font-size: 0.6rem; padding: 4px 8px; border-color: var(--primary); color: var(--primary); width: auto;" onclick="promptInvite('${friend.username}')">INVITE</button>` : ''}
                <button class="btn-primary" style="font-size: 0.6rem; padding: 4px 8px; width: auto;" onclick="openDM('${friend.username}')">MESSAGE</button>
                <button class="btn-secondary" style="font-size: 0.6rem; padding: 4px 8px; border-color: #ff4b4b; color: #ff4b4b; width: auto;" onclick="unfriend('${friend.username}')">UNFRIEND</button>
            </div>
        </div>`;
    }).join('');
}

async function promptInvite(target) {
    const res = await fetch('/garage_ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'get_joined' })
    });
    const data = await res.json();
    const adminGars = data.filter(g => g.role === 'Founder' || g.role === 'Admin');

    // Filter out garages where they are already a member
    const targetGars = adminGars.filter(g => !g.members.includes(target));

    if (targetGars.length === 0) {
        alert(`${target} is already a member of all your managed garages.`);
        return;
    }

    let menu = "Select a Garage to invite " + target + " to:\n\n";
    targetGars.forEach((g, idx) => {
        menu += `${idx + 1}. ${g.name} (ID: ${g.id})\n`;
    });

    const choice = prompt(menu + "\nEnter Number:");
    if (choice && targetGars[choice - 1]) {
        const garage = targetGars[choice - 1];
        garageOp('invite', target, garage.id); // Fixed arg order: target, then id
    }
}

let activeDM = null;
function openDM(target) {
    activeDM = target;
    document.getElementById('dm-target-name').innerText = target;
    document.getElementById('dm-overlay').style.display = 'flex';
    loadDMs();
}
function closeDM() { document.getElementById('dm-overlay').style.display = 'none'; activeDM = null; }

async function sendDM() {
    const input = document.getElementById('dm-input');
    const msg = input.value;
    if (!msg || !activeDM) return;
    await fetch('/direct_messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'send', target: activeDM, msg })
    });
    input.value = '';
    loadDMs();
}

async function loadDMs() {
    if (!activeDM) return;
    const res = await fetch('/direct_messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'get', target: activeDM })
    });
    const data = await res.json();
    const box = document.getElementById('dm-msgs');
    box.innerHTML = data.map(m => `
        <div style="margin-bottom: 8px; text-align: ${m.from === activeDM ? 'left' : 'right'};">
            <span style="display:inline-block; padding: 6px 10px; border-radius: 10px; background: ${m.from === activeDM ? 'rgba(255,255,255,0.1)' : 'var(--primary)'}; color: ${m.from === activeDM ? '#fff' : '#000'}; border: 1px solid var(--glass-border);">
                ${m.msg}
            </span>
            <div style="font-size: 0.5rem; opacity: 0.4; margin-top:2px;">${m.time}</div>
        </div>`).join('');
    box.scrollTop = box.scrollHeight;
    loadConnections(); // Refresh unread count
}

// SUPPORT PORTAL FOR STAFF
let activeTicketUser = null;
function openSupportPortal() {
    document.getElementById('support-portal-overlay').style.display = 'flex';
    loadPortalTickets();
}
function closeSupportPortal() { document.getElementById('support-portal-overlay').style.display = 'none'; }

async function loadPortalTickets() {
    const res = await fetch('/support_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'get_all' })
    });
    const tickets = await res.json();
    const list = document.getElementById('support-ticket-list');
    list.innerHTML = Object.keys(tickets).map(user => `
        <div class="expense-item" style="padding:10px; cursor:pointer; ${activeTicketUser === user ? 'border: 1px solid var(--secondary);' : ''}" onclick="viewPortalTicket('${user}')">
            <b>${user}</b>
            <span style="font-size:0.6rem; color:var(--secondary);">(${tickets[user].length} messages)</span>
        </div>`).join('');
}

async function viewPortalTicket(user) {
    activeTicketUser = user;
    loadPortalTickets(); // refresh highlighting
    const res = await fetch('/support_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'get_all' })
    });
    const tickets = await res.json();
    const msgs = tickets[user] || [];
    const box = document.getElementById('portal-msgs');
    box.innerHTML = msgs.map(m => `
        <div style="margin-bottom:12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom:5px;">
            <b style="color:${m.user === 'Support Person' ? 'var(--secondary)' : 'var(--primary)'}">${m.user}:</b>
            <div style="font-size:0.85rem; padding: 5px 0;">${m.msg}</div>
            <div style="font-size:0.6rem; opacity:0.4;">${m.time}</div>
        </div>`).join('');
    box.scrollTop = box.scrollHeight;
}

async function portalRespond() {
    const input = document.getElementById('portal-input');
    const msg = input.value.trim();
    if (!msg || !activeTicketUser) return;

    await fetch('/support_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'respond', target: activeTicketUser, msg })
    });
    input.value = '';
    viewPortalTicket(activeTicketUser);
}

async function unfriend(target) {
    if (!confirm(`Are you sure you want to remove ${target} from your network? This action is permanent and mutual.`)) return;

    await fetch('/connection_ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'unfriend', target })
    });
    loadProfile();
}

function openPublicSupport() {
    const user = document.getElementById('reset-user').value || prompt("Please enter your username for the ticket:");
    if (!user) return;
    const issue = prompt("Describe your issue (e.g., 'Forgotten Pin', 'Locked out'):");
    if (!issue) return;

    fetch('/public_support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, msg: issue })
    }).then(res => res.json()).then(data => {
        alert(data.message + "\n\nDeveloper Context: The dev will see this in the support dashboard and can match your username to your records.");
    });
}

function togglePassword(id, el) {
    const input = document.getElementById(id);
    if (input.type === 'password') {
        input.type = 'text';
        el.innerText = 'visibility_off';
    } else {
        input.type = 'password';
        el.innerText = 'visibility';
    }
}

function confirmLogout() {
    if (confirm("Are you sure you want to terminate your secure session and logout?")) {
        location.reload();
    }
}

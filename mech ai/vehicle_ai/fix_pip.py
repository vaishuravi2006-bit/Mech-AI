import urllib.request
import os
import subprocess
import sys

def install_pip():
    print("Downloading pip installer...")
    url = "https://bootstrap.pypa.io/get-pip.py"
    try:
        urllib.request.urlretrieve(url, "get-pip.py")
        print("Download complete.")
        
        print("Installing pip...")
        subprocess.check_call([sys.executable, "get-pip.py"])
        print("Pip installed successfully!")
        
        print("Cleaning up...")
        os.remove("get-pip.py")
        
        print("\nNow you can install dependencies. Run:")
        print(f"{sys.executable} -m pip install -r requirements.txt")
        
    except Exception as e:
        print(f"Error: {e}")
        print("Try running: python -m ensurepip --default-pip")

if __name__ == "__main__":
    # First try the built-in ensurepip
    try:
        print("Trying built-in ensurepip...")
        subprocess.check_call([sys.executable, "-m", "ensurepip", "--default-pip"])
        print("Pip installed/verified via ensurepip.")
        print("\nNow run: python -m pip install -r requirements.txt")
    except:
        print("ensurepip failed, trying manual download...")
        install_pip()

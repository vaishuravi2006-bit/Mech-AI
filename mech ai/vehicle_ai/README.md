# Intelligent Vehicle Diagnosis System

## How to Run
This is a web application built with Python (Flask) and HTML/JS.

### Prerequisites
- Python installed on your system.

### Steps to Start
1. **Open Terminal** (Command Prompt or PowerShell).
2. **Navigate to project folder**:
   ```sh
   cd "c:\Users\THILLAI NATHAN\Desktop\vehicle_ai"
   ```
3. **Install Dependencies**:
   ```sh
   pip install -r requirements.txt
   ```
4. **Run the App**:
   ```sh
   python app.py
   ```
5. **Open in Browser**:
   - Go to [http://127.0.0.1:5000](http://127.0.0.1:5000)
   - Allow **Location Access** when prompted (required for GPS features).

### Features
- **Vehicle Diagnosis**: Select Vehicle -> Area -> Symptom.
- **Find Shops**: Auto-detects 10km radius for specialized mechanics (Bike vs Car).
- **Navigation**: Click "Navigate" on any shop to draw a route.

# 🔐 Backend – Password Security Analyzer

REST API built with **FastAPI + Python**, designed to analyze passwords from a realistic cybersecurity perspective.

This project goes beyond simply telling whether a password is “secure” or not. Its goal is to simulate how a password could be attacked in real-world scenarios, combining brute-force techniques, real-world dictionaries, and targeted attacks.

> The idea is simple: you can’t defend what you don’t understand.

---

## 📋 Requirements

* Python 3.11+
* pip

---

## 🚀 Local Installation

### Start the Frontend

```bash
npm run dev
```

---

## ⚠️ IMPORTANT

Make sure to run the backend from inside the `/backend` folder.

### Start the Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 🌐 API Access

* API: [http://localhost:8000](http://localhost:8000)
* Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📡 Endpoints

| Method | Route                      | Description                                 |
| ------ | -------------------------- | ------------------------------------------- |
| `POST` | `/api/analyze`             | Analyze password using universal dictionary |
| `POST` | `/api/analyze-with-custom` | Generate custom dictionary and analyze      |
| `POST` | `/api/generate-custom`     | Generate custom dictionary only             |
| `GET`  | `/health`                  | Health check                                |

---

## 🧪 Usage Examples

### Standard Analysis

```json
POST /api/analyze
{
  "password": "miperro2024",
  "dictionaries": ["universal"]
}
```

---

### Custom Dictionary Analysis (Targeted Attack Simulation)

```json
POST /api/analyze-with-custom
{
  "password": "luna2024",
  "personalData": {
    "name": "Juan",
    "birthYear": "1995",
    "pet": "Luna",
    "familyMember": "Maria",
    "hobby": "football",
    "phrase": "always",
    "numbers": "10"
  }
}
```

---

## ☁️ Deploy on Render (Free)

1. Push your repository to GitHub
2. Go to [https://render.com](https://render.com) → New Web Service
3. Configure:

   * **Root directory:** `backend`
   * **Build command:** `pip install -r requirements.txt`
   * **Start command:**

     ```bash
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
4. Use the generated URL in your frontend

---

## 🔒 Privacy

* Passwords are **never stored or logged**
* Personal data is **never persisted**
* All processing happens in memory during the request
* No database is used

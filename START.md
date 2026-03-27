# How to run Coffee Co. Dashboard

## 1. Add your API key
Edit `backend/.env` and set your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-...
```

## 2. Start the backend (Terminal 1)
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```
> Use the full path if needed:
> `C:\Users\moham\AppData\Local\Programs\Python\Python312\python.exe -m uvicorn main:app --reload --port 8000`

## 3. Start the frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

## 4. Open the dashboard
Go to http://localhost:5173

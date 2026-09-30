import uvicorn
from services.chat_service import send_request_to_openrouter
from schemas import *

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi import HTTPException
from config import get_settings
from schemas.responses import *

from services.chat_storage_service import create_db

def main():
    app = FastAPI()
    settings = get_settings()
    
    @app.post("/api/chat")
    async def send_request(input : str):
        req = send_request_to_openrouter(input)
        try:
            req = ChatCompletedReponse.model_validate(req)
        except Exception as e:
            print(f"error {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Something went wrong while sending request, {e}"
            )
        return {"response" : req.choices[0].message.content}
            
    app.mount("/", StaticFiles(directory=settings.FRONTEND_DIR, html=True), name="frontend")

    uvicorn.run(app, port=8000)

if __name__ == "__main__":
    create_db()
    # main()
    
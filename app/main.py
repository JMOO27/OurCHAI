import uvicorn
import json

from services.chat_service import send_request_to_openrouter
from schemas import *
from config import get_settings
from schemas.responses import *
from services.chat_storage_service import *

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi import HTTPException

from pydantic import ValidationError

def main():
    app = FastAPI()
    settings = get_settings()
    
    @app.post("/api/create_chat")
    async def send_request(input : str, new_chat : bool):
        req = send_request_to_openrouter(input)
        req_schema = None

        try:
            req_schema = ChatCompletedReponse.model_validate(req)

        except ValidationError as e:
            print(f"API response is not valid! {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Something went wrong while sending request, {e}."
            )

        if new_chat:
            try:
                create_conv(0)
                # todo: get conv_id, default will be 0 for now.
                create_chat(0, json.dumps(req))
                return req_schema.choices[0].message.content
                
            except Exception as e:
                print(e)

        else:
            try:
                create_chat(0, json.dumps(req))
                return req_schema.choices[0].message.content
            except Exception as e:
                print(e)

        
    app.mount("/", StaticFiles(directory=settings.FRONTEND_DIR, html=True), name="frontend")

    uvicorn.run(app, port=8000)

if __name__ == "__main__":
    main()
    
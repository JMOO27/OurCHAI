import uvicorn
from services.chat_service import send_request_to_openrouter
from schemas import *

from fastapi import FastAPI
from config import get_settings
from schemas.responses import *

def main():
    app = FastAPI()
    settings = get_settings()
    print(settings.API_KEY)

    data = send_request_to_openrouter("Respond in English, hello mr bot!!")
    gdata = ChatCompletedReponse.model_validate(data)
    print(gdata.choices[0].message.content)
    # uvicorn.run(app, port=8000)

if __name__ == "__main__":
    main()
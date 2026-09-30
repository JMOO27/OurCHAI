from config import get_settings
import requests
import json

def send_request_to_openrouter(content : str) -> object | None:
    settings = get_settings()

    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.API_KEY.get_secret_value()}",
        },
        data = json.dumps ({
            "model": f"{settings.MODEL}",
            "messages": [
                {
                "role": "user",
                "content" : f"{content}"
                }
            ]
        })

    )

    match response.status_code:
        case 200:
            return response.json()

        case _:
            print(response.status_code)
            return None

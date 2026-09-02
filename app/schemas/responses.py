from pydantic import BaseModel

class ReasoningDetails(BaseModel):
    type : str
    text : str
    format : str
    index : int

class Message(BaseModel):
    role : str
    content : str
    refusal : str | None
    reasoning : str | None
    reasoning_details : list[ReasoningDetails] | None = None

class Choices(BaseModel):
    index : int
    logprobs : dict[str, object] | None
    finish_reason : str | None
    native_finish_reason : str | None
    message : Message

class Prompt_Tokens_Details(BaseModel):
    cached_tokens : int
    cache_write_tokens : int
    audio_tokens : int
    video_tokens : int 

class Cost_Details(BaseModel):
    upstream_inference_cost : float
    upstream_inference_prompt_cost : float
    upstream_inference_completions_cost : float

class Completion_Token_Details(BaseModel):
    reasoning_tokens : int
    image_tokens : int
    audio_tokens : int

class Usage(BaseModel):
    prompt_tokens : int
    completion_tokens : int
    total_tokens : int
    cost : float
    is_byok : bool
    prompt_tokens_details : Prompt_Tokens_Details
    cost_details : Cost_Details
    completion_tokens_details : Completion_Token_Details

class ChatCompletedReponse(BaseModel):
    id : str
    object : str
    created : int
    model : str
    provider : str
    system_fingerprint : str | None
    service_tier : str | None
    choices : list[Choices]
    usage : Usage


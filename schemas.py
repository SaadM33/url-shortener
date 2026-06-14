from pydantic import BaseModel, AnyHttpUrl
from datetime import datetime

class URLInput(BaseModel):
    url: AnyHttpUrl

class URLResponse(BaseModel):
    id: int
    long_url: str
    short_code: str
    visits: int
    created_at: datetime

    class Config:
        from_attributes = True # This allows Pydantic to work with ORM models directly, enabling automatic conversion of SQLAlchemy model instances to Pydantic models.
                        # in simple terms, it allows Pydantic to read data from SQLAlchemy models and convert them into Pydantic models without needing to manually extract each field.
                        # for example, if you have a SQLAlchemy model instance representing a URL, you can directly pass it to a Pydantic model (like URLResponse) and it will automatically populate the fields based on the SQLAlchemy model's attributes.
                        # we can use this feature to return SQLAlchemy model instances directly from our FastAPI endpoints, and Pydantic will handle the conversion to the appropriate response model.
                        # the problem this whole thing solves is that it simplifies the process of converting data between SQLAlchemy models and Pydantic models, making it easier to work with databases in FastAPI applications.
                        # the reason we convert SQLAlchemy models to Pydantic models is that Pydantic models provide data validation, serialization, and documentation features that are useful for API responses. By converting SQLAlchemy models to Pydantic models, we can ensure that the data returned from our API endpoints is properly validated and formatted according to the defined schema.
                        # if we don't convert SQLAlchemy models to Pydantic models, we might encounter issues such as:
                        # - Lack of validation: SQLAlchemy models do not provide built-in validation for the data they represent. Pydantic models, on the other hand, allow us to define validation rules for each field, ensuring that the data returned from our API endpoints meets the expected criteria.
                        # - Serialization issues: SQLAlchemy models may contain complex data types or relationships that are not easily serializable to JSON. Pydantic models handle serialization automatically, converting complex data types into JSON-compatible formats.
                        # - Documentation generation: FastAPI uses Pydantic models to generate API documentation automatically. If we don't convert SQLAlchemy models to Pydantic models, we may lose the ability to generate accurate and comprehensive API documentation.

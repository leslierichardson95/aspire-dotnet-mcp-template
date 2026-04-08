import random

from mcp.server.fastmcp import FastMCP
from starlette.responses import JSONResponse

mcp = FastMCP("mcp-server", stateless_http=True, json_response=True)


# Sample tool — generates a random number between min and max.
@mcp.tool()
def get_random_number(min: int = 0, max: int = 100) -> int:
    """Generates a random number between the specified minimum and maximum values.

    Args:
        min: Minimum value (inclusive)
        max: Maximum value (exclusive)
    """
    return random.randint(min, max - 1)


# Health check endpoint for Aspire orchestration.
@mcp.custom_route("/health", methods=["GET"])
async def health_check(request):
    return JSONResponse({"status": "healthy"})


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=8080)

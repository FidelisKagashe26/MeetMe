# ws_client.py
import asyncio
import json
from urllib.parse import quote

import websockets

# HAPA weka token yako ya ACCESS uliyoweka kwenye $ACCESS
ACCESS_TOKEN ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY0MzMwMTI2LCJpYXQiOjE3NjQzMjkyMjYsImp0aSI6ImFmNGQ5MjBmYmE3ZDRmOTlhNTVmZDhmN2JiZmFiYTY0IiwidXNlcl9pZCI6IjEifQ.opG0M0ivP3xKGpoaZ8SC6LzHyTdKAPFhi_7F2U6n9Zc"

# Na hii weka ID ya mazungumzo unayotaka kuitest
CONVERSATION_ID = 4


async def main():
    # muhimu: token tui-URL-encode kama browser
    token_param = quote(ACCESS_TOKEN)
    url = f"ws://127.0.0.1:8000/ws/chat/{CONVERSATION_ID}/?token={token_param}"
    print("Connecting to:", url)

    try:
        async with websockets.connect(url) as ws:
            print("✅ Connected to WebSocket")

            # Tuma typing event kama test
            typing_payload = {"type": "typing", "is_typing": True}
            await ws.send(json.dumps(typing_payload))
            print("➡️ Sent:", typing_payload)

            print("\n⏳ Waiting for incoming messages (CTRL+C to exit)...\n")
            while True:
                msg = await ws.recv()
                try:
                    data = json.loads(msg)
                    print("⬅️ Received JSON:", json.dumps(data, indent=2))
                except json.JSONDecodeError:
                    print("⬅️ Received RAW:", msg)

    except websockets.exceptions.ConnectionClosed as e:
        print(f"❌ Connection closed: code={e.code}, reason={e.reason}")
    except Exception as e:
        print("❌ Error:", e)


if __name__ == "__main__":
    asyncio.run(main())

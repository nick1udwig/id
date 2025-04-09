import { useState, useEffect, useCallback } from "react";
import HyperwareClientApi from "@hyperware-ai/client-api";
import "./App.css";
import { SignIdMessage } from "./types/Id";
import useIdStore from "./store/id";

const BASE_URL = import.meta.env.BASE_URL;
if (window.our) window.our.process = BASE_URL?.replace("/", "");

const PROXY_TARGET = `${(import.meta.env.VITE_NODE_URL || "http://localhost:8080")}${BASE_URL}`;

// This env also has BASE_URL which should match the process + package name
const WEBSOCKET_URL = import.meta.env.DEV
  ? `${PROXY_TARGET.replace('http', 'ws')}`
  : undefined;

function App() {
  const { ids, addMessage, set } = useIdStore();
  const [selectedId, setSelectedId] = useState("New Id");

  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [nodeConnected, setNodeConnected] = useState(true);
  const [api, setApi] = useState<HyperwareClientApi | undefined>();

  useEffect(() => {
    // Get message history using http
    fetch(`${BASE_URL}/messages`)
      .then((response) => response.json())
      .then((data) => {
        set({ ids: { ...(data?.History?.messages || {}), "New Id": [] } });
      })
      .catch((error) => console.error(error));

    // Connect to the Hyperdrive via websocket
    console.log('WEBSOCKET URL', WEBSOCKET_URL)
    if (window.our?.node && window.our?.process) {
      const api = new HyperwareClientApi({
        uri: WEBSOCKET_URL,
        nodeId: window.our.node,
        processId: window.our.process,
        onOpen: (_event, _api) => {
          console.log("Connected to Hyperware");
        },
        onMessage: (json, _api) => {
          console.log('WEBSOCKET MESSAGE', json)
          try {
            const data = JSON.parse(json);
            console.log("WebSocket received message", data);
            const [messageType] = Object.keys(data);
            if (!messageType) return;

            if (messageType === "NewMessage") {
              addMessage(data.NewMessage);
            }
          } catch (error) {
            console.error("Error parsing WebSocket message", error);
          }
        },
      });

      setApi(api);
    } else {
      setNodeConnected(false);
    }
  }, []);

  const startId = useCallback(
    (event) => {
      event.preventDefault();

      if (!api || !target) return;

      const newIds = { ...ids };
      newIds[target] = [];

      setSelectedId(target);
      set({ ids: newIds });

      setTarget("");
    },
    [api, ids, set, setSelectedId, target, setTarget]
  );

  const sendMessage = useCallback(
    async (event) => {
      event.preventDefault();

      if (!api || !message || !selectedId) return;

      // Create a message object
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(message);
      const messageArray = Array.from(messageBytes);
      const data = {
        Sign:  messageArray,
      } as SignIdMessage;

      // Send a message to the node via websocket
      // UNCOMMENT THE FOLLOWING 2 LINES to send message via websocket
      // api.send({ data });
      // setMessage("");

      // Send a message to the node via HTTP request
      // IF YOU UNCOMMENTED THE LINES ABOVE, COMMENT OUT THIS try/catch BLOCK
      try {
        const result = await fetch(`${BASE_URL}/api`, {
          method: "POST",
          body: JSON.stringify(data),
        });

        if (!result.ok) throw new Error("HTTP request failed");

        // Add the message if the POST request was successful
        const newIds = { ...ids };
        newIds[selectedId].push({ author: window.our?.node, content: message });
        set({ ids: newIds });
        setMessage("");
      } catch (error) {
        console.error(error);
      }
    },
    [api, message, setMessage, selectedId, ids, set]
  );

  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "absolute", top: 4, left: 8 }}>
        ID: <strong>{window.our?.node}</strong>
      </div>
      {!nodeConnected && (
        <div className="node-not-connected">
          <h2 style={{ color: "red" }}>Node not connected</h2>
          <h4>
            You need to start a node at {PROXY_TARGET} before you can use this UI
            in development.
          </h4>
        </div>
      )}
      <h2>Simple Id on Hyperware</h2>
      <div className="card">
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            border: "1px solid gray",
          }}
        >
          <div
            style={{ flex: 1, borderRight: "1px solid gray", padding: "1em" }}
          >
            <h3 style={{ marginTop: 0 }}>Ids</h3>
            <ul>
              {Object.keys(ids).map((idId) => (
                <li key={idId}>
                  <button
                    onClick={() => setSelectedId(idId)}
                    className={`id-button ${selectedId === idId ? "selected" : ""}`}
                  >
                    {idId}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 2,
              padding: "1em",
            }}
          >
            <h3 style={{ marginTop: 0, textAlign: 'left' }}>{selectedId}</h3>
            {selectedId === "New Id" ? (
              <form
                onSubmit={startId}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <label
                  style={{ fontWeight: 600, alignSelf: "flex-start" }}
                  htmlFor="target"
                >
                  Node
                </label>
                <input
                  style={{
                    padding: "0.25em 0.5em",
                    fontSize: "1em",
                    marginBottom: "1em",
                  }}
                  type="text"
                  id="target"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                />
                <button type="submit">Start New Id</button>
              </form>
            ) : (
              <div>
                <div>
                  <ul className="message-list">
                    {selectedId &&
                      ids[selectedId]?.map((message, index) => (
                        <li key={index} className={`message ${message.author === window.our?.node ? 'ours' : ''}`}>
                          {message.content}
                        </li>
                      ))}
                  </ul>
                </div>
                <form
                  onSubmit={sendMessage}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                  }}
                >
                  <div className="input-row">
                    <input
                      type="text"
                      id="message"
                      placeholder="Message"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      autoFocus
                    />
                    <button type="submit">Send</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
        <p>
          Edit <code>src/App.tsx</code> and save to test Hot Module Reloading
          (HMR)
        </p>
      </div>
    </div>
  );
}

export default App;

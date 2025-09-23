import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";

function App() {
  const [temp, setTemp] = useState("-");
  const [moisture, setMoisture] = useState("-");
  const [ph, setPh] = useState("-");
  const [sunlight, setSunlight] = useState("-");
  const [status, setStatus] = useState("-");
  const [healthPercent, setHealthPercent] = useState(80);
  const [plantImg, setPlantImg] = useState(
    "https://blueworldgardener.co.uk/wp-content/uploads/2021/08/Egeria_densa__oxygenerator-1.jpg"
  );

  const [plasticResult, setPlasticResult] = useState(<p>No detection yet.</p>);

  const plantCamRef = useRef(null);
  const plasticCamRef = useRef(null);
  const plasticCanvasRef = useRef(null);

  // -----------------------
  // Initialize webcam feed
  // -----------------------
  useEffect(() => {
    const enableCamera = (ref) => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          if (ref.current) {
            ref.current.srcObject = stream;
            ref.current.onloadedmetadata = () => {
              ref.current.play();
            };
          }
        })
        .catch((err) => console.error("Camera error: ", err));
    };

    enableCamera(plantCamRef);
    enableCamera(plasticCamRef);
  }, []);

  // -----------------------
  // Plant Analysis Function (unchanged)
  // -----------------------
  const analyzePlantReal = () => {
    let t = Math.floor(Math.random() * 15) + 20;
    let m = Math.floor(Math.random() * 50) + 30;
    let p = (Math.random() * (8 - 5) + 5).toFixed(1);
    let s = Math.floor(Math.random() * 1000) + 300;

    setTemp(t);
    setMoisture(m);
    setPh(p);
    setSunlight(s);

    let score = 100;
    if (t < 22 || t > 32) score -= 20;
    if (m < 40 || m > 70) score -= 20;
    if (p < 6 || p > 7.5) score -= 20;
    if (s < 400 || s > 1000) score -= 20;

    if (score > 80) setStatus("Healthy");
    else if (score > 50) setStatus("Moderate");
    else setStatus("Unhealthy");

    setHealthPercent(score);

    if (plantCamRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = plantCamRef.current.videoWidth;
      canvas.height = plantCamRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(plantCamRef.current, 0, 0, canvas.width, canvas.height);
      const imgData = canvas.toDataURL("image/png");
      setPlantImg(imgData);
    }
  };

  // -----------------------
  // Plastic Detection with Obstacle-style Overlay
  // -----------------------
  useEffect(() => {
    let model;
    let animationId;

    async function runDetection() {
      model = await cocoSsd.load();
      console.log("✅ Plastic detection model loaded");

      async function detect() {
        if (
          plasticCamRef.current &&
          plasticCanvasRef.current &&
          plasticCamRef.current.readyState === 4
        ) {
          const video = plasticCamRef.current;
          const canvas = plasticCanvasRef.current;
          const ctx = canvas.getContext("2d");

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const preds = await model.detect(video);

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          let foundPlastic = false;

          preds.forEach((p) => {
            if (["bottle", "cup", "bag"].includes(p.class) && p.score > 0.45) {
              foundPlastic = true;
              const [x, y, w, h] = p.bbox;
              ctx.strokeStyle = "lime";
              ctx.lineWidth = 2;
              ctx.strokeRect(x, y, w, h);
              ctx.fillStyle = "lime";
              ctx.font = "14px sans-serif";
              ctx.fillText(
                `${p.class} ${(p.score * 100).toFixed(1)}%`,
                x,
                y > 10 ? y - 5 : 10
              );
            }
          });

          if (foundPlastic) {
            setPlasticResult(
              <div className="alert-custom text-center">
                🚨 Plastic Detected in Frame!
              </div>
            );
          } else {
            setPlasticResult(
              <div className="alert alert-success text-center">
                ✅ No Plastic Detected
              </div>
            );
          }
        }

        animationId = requestAnimationFrame(detect);
      }

      detect();
    }

    runDetection();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="container-fluid py-4">
      <h1 className="text-center fw-bold">
        🌊 Sea Waste & Plant Health Monitoring
      </h1>
      <div className="row g-4">
        {/* Plant Camera */}
        <div className="col-lg-6">
          <div className="section-card text-center">
            <h4>
              <i className="bi bi-camera-video-fill"></i> Drone Camera 1 (Plant
              Monitoring)
            </h4>
            <div className="video-box my-2">
              <video
                ref={plantCamRef}
                width="100%"
                height="100%"
                autoPlay
                muted
                playsInline
              />
            </div>
            <button className="btn fw-bold" onClick={analyzePlantReal}>
              🌱 Analyze Plant
            </button>
          </div>
        </div>

        {/* Plant Health Info */}
        <div className="col-lg-6">
          <div className="section-card">
            <h4 className="text-center">
              <i className="bi bi-flower1"></i> Plant Health Details
            </h4>
            <div className="row mt-3">
              <div className="col-md-6">
                <img src={plantImg} className="plant-img" alt="Plant" />
              </div>
              <div className="col-md-6">
                <div className="plant-health">
                  🌡 Temperature: <span>{temp}</span> °C
                </div>
                <div className="plant-health">
                  💧 Moisture: <span>{moisture}</span> %
                </div>
                <div className="plant-health">
                  ⚗ pH Level: <span>{ph}</span>
                </div>
                <div className="plant-health">
                  ☀ Sunlight: <span>{sunlight}</span> lux
                </div>
                <hr />
                <div className="plant-health">
                  🌱 Overall Health:{" "}
                  <span
                    className={`fw-bold ${
                      status === "Healthy"
                        ? "text-success"
                        : status === "Moderate"
                        ? "text-warning"
                        : "text-danger"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <div className="progress mt-2">
                  <div
                    className={`progress-bar ${
                      status === "Healthy"
                        ? "bg-success"
                        : status === "Moderate"
                        ? "bg-warning"
                        : "bg-danger"
                    }`}
                    style={{ width: `${healthPercent}%` }}
                  >
                    {healthPercent}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Plastic Camera with Canvas Overlay */}
        <div className="col-lg-6">
          <div className="section-card text-center">
            <h4>
              <i className="bi bi-camera-video"></i> Drone Camera 2 (Plastic
              Detection)
            </h4>
            <div className="video-box my-2" style={{ position: "relative" }}>
              <video
                ref={plasticCamRef}
                width="100%"
                height="100%"
                autoPlay
                muted
                playsInline
                style={{ borderRadius: "8px" }}
              />
              <canvas
                ref={plasticCanvasRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  borderRadius: "8px",
                }}
              />
            </div>
          </div>
        </div>

        {/* Plastic Results */}
        <div className="col-lg-6">
          <div className="section-card">
            <h4 className="text-center">
              <i className="bi bi-exclamation-triangle"></i> Plastic Detection
              Results
            </h4>
            <div className="text-center mt-3">{plasticResult}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

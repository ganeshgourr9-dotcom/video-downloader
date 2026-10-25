"use client";

import { useState } from "react";

type Platform = "YouTube" | "Instagram" | "Facebook";

export default function Home() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<Platform>("YouTube");
  const [message, setMessage] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("videodrop-video.mp4");
  const [hasRights, setHasRights] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<"mp4" | "mp3">("mp4");
  const [isLoading, setIsLoading] = useState(false);
  const [apiVideo, setApiVideo] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_DOWNLOADER_API_URL?.replace(/\/$/, "");

  function detectPlatform(value: string): Platform | null {
    try {
      const parsed = new URL(value.trim());
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

      if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) return "YouTube";
      if (host === "instagram.com" || host.endsWith(".instagram.com")) return "Instagram";
      if (host === "facebook.com" || host === "fb.watch" || host.endsWith(".facebook.com")) return "Facebook";
      return null;
    } catch {
      return null;
    }
  }

  function clearResults() {
    setMessage("");
    setOfficialUrl("");
    setDownloadUrl("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearResults();
    setApiVideo(false);

    const value = url.trim();
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      setMessage("कृपया सही वीडियो लिंक डालें।");
      return;
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      setMessage("केवल HTTP या HTTPS लिंक स्वीकार किए जाते हैं।");
      return;
    }

    const extension = parsed.pathname.match(/\\.(mp4|webm|mov|m4v|ogv)$/i)?.[1]?.toLowerCase();
    if (!hasRights) {
      setMessage("आगे बढ़ने से पहले पुष्टि करें कि आपको इस वीडियो को डाउनलोड करने का अधिकार है।");
      return;
    }

    if (apiBase) {
      setIsLoading(true);
      try {
        const response = await fetch(`${apiBase}/api/info`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: parsed.href }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "वीडियो की जानकारी नहीं मिल सकी।");
        setPlatform(detectPlatform(value) || "YouTube");
        setOfficialUrl(value);
        setApiVideo(true);
        setMessage(`वीडियो मिला: ${data.title || "वीडियो"}। अब MP4 या MP3 चुनकर डाउनलोड करें।`);
        return;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "वीडियो की जानकारी प्राप्त नहीं हो सकी।");
        return;
      } finally {
        setIsLoading(false);
      }
    }

    if (extension) {
      setDownloadUrl(parsed.href);
      setDownloadName(`videodrop-video.${extension}`);
      setMessage("सीधा वीडियो फ़ाइल लिंक पहचाना गया। डाउनलोड स्रोत की अनुमति और ब्राउज़र की नीतियों पर निर्भर करता है।");
      return;
    }

    const detected = detectPlatform(value);
    if (!detected) {
      setMessage("यह समर्थित प्लेटफ़ॉर्म लिंक या पहचानी गई वीडियो फ़ाइल नहीं है।");
      return;
    }

    setPlatform(detected);
    setOfficialUrl(value);
    setMessage("लिंक पहचान लिया गया, लेकिन डाउनलोड सर्वर अभी कॉन्फ़िगर नहीं है। NEXT_PUBLIC_DOWNLOADER_API_URL सेट करने के बाद सोशल-मीडिया डाउनलोड उपलब्ध होगा।");
  }

  async function handleApiDownload() {
    if (!apiBase || !officialUrl || !hasRights) return;
    setIsLoading(true);
    setMessage(`${selectedFormat.toUpperCase()} तैयार हो रहा है। फ़ाइल के आकार और स्रोत के अनुसार समय लग सकता है…`);
    try {
      const response = await fetch(`${apiBase}/api/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: officialUrl, format: selectedFormat }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "डाउनलोड विफल रहा। कृपया दूसरा लिंक आज़माएँ।");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `videodrop-video.${selectedFormat}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage("डाउनलोड शुरू हो गया है।");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "डाउनलोड विफल रहा।");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="VideoDrop Home">
          <span className="brand-icon">V</span>
          <span>Video<span className="brand-accent">Drop</span></span>
        </a>
        <span className="header-label">Free video link tool</span>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="live-dot" /> SIMPLE · FAST · FREE</div>
        <h1>आपका वीडियो,<br /><span>एक ही जगह।</span></h1>
        <p className="hero-copy">
          YouTube, Instagram या Facebook का लिंक पहचानें,
          या अधिकृत सीधे वीडियो फ़ाइल लिंक से डाउनलोड करने का प्रयास करें।
        </p>

        <div className="platforms" aria-label="Platform selection">
          {(["YouTube", "Instagram", "Facebook"] as Platform[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`platform ${platform === item ? "selected" : ""}`}
              onClick={() => {
                setPlatform(item);
                clearResults();
              }}
              aria-pressed={platform === item}
            >
              <span className={`platform-symbol ${item.toLowerCase()}`}>
                {item === "YouTube" ? "▶" : item === "Instagram" ? "◎" : "f"}
              </span>
              {item}
            </button>
          ))}
        </div>

        <form className="link-form" onSubmit={handleSubmit}>
          <label htmlFor="video-url">वीडियो का लिंक</label>
          <div className="input-row">
            <span className="link-icon">↗</span>
            <input
              id="video-url"
              type="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                clearResults();
              }}
              placeholder="https://... वीडियो लिंक यहाँ पेस्ट करें"
              autoComplete="url"
              required
            />
            {url && (
              <button
                className="clear-button"
                type="button"
                onClick={() => {
                  setUrl("");
                  clearResults();
                }}
                aria-label="Clear link"
              >×</button>
            )}
          </div>

          <label className="rights-check">
            <input
              type="checkbox"
              checked={hasRights}
              onChange={(event) => setHasRights(event.target.checked)}
            />
            <span>मेरे पास इस वीडियो को डाउनलोड करने या उपयोग करने का अधिकार है।</span>
          </label>

          <button className="submit-button" type="submit">
            लिंक जाँचें <span>→</span>
          </button>
          <p className="privacy-note"><span>✓</span> कोई अकाउंट नहीं · कोई साइन-अप नहीं</p>
        </form>

        {message && (
          <div className="result" role="status">
            <strong>{downloadUrl ? "वीडियो फ़ाइल का लिंक मिला" : officialUrl ? "सोशल-मीडिया लिंक मिला" : "लिंक जाँचें"}</strong>
            <p>{message}</p>

            {apiVideo && (
              <div className="download-options">
                <label htmlFor="download-format">फ़ॉर्मैट चुनें</label>
                <select id="download-format" value={selectedFormat} onChange={(event) => setSelectedFormat(event.target.value as "mp4" | "mp3")}>
                  <option value="mp4">MP4 वीडियो</option>
                  <option value="mp3">MP3 ऑडियो</option>
                </select>
                <button className="official-button download-button" type="button" onClick={handleApiDownload} disabled={isLoading}>
                  {isLoading ? "डाउनलोड तैयार हो रहा है…" : `↓ ${selectedFormat.toUpperCase()} डाउनलोड करें`}
                </button>
              </div>\n            )}\n\n            {downloadUrl && (
              <a
                className="official-button download-button"
                href={downloadUrl}
                download={downloadName}
                target="_blank"
                rel="noopener noreferrer"
              >
                ↓ वीडियो डाउनलोड करें
              </a>
            )}

            {officialUrl && (
              <a className="official-button" href={officialUrl} target="_blank" rel="noopener noreferrer">
                मूल वीडियो खोलें ↗
              </a>
            )}
          </div>
        )}

        <p className="disclaimer">
          केवल सार्वजनिक लिंक होने से डाउनलोड की अनुमति सुनिश्चित नहीं होती।
          डाउनलोड की उपलब्धता स्रोत के नियमों और ब्राउज़र की नीतियों पर निर्भर करती है।
        </p>
      </section>

      <section className="ad-section">
        <div className="ad-label">ADVERTISEMENT</div>
        <div className="ad-content">
          <span className="ad-icon">▧</span>
          <div>
            <strong>विज्ञापन के लिए जगह</strong>
            <p>भविष्य में विज्ञापन नेटवर्क जुड़ने पर यहाँ विज्ञापन दिख सकता है।</p>
          </div>
        </div>
      </section>

      <section className="steps">
        <div className="section-heading">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>तीन आसान चरण</h2>
        </div>
        <div className="step-grid">
          <article className="step-card">
            <span className="step-number">01</span>
            <div className="step-icon">↗</div>
            <h3>वीडियो लिंक कॉपी करें</h3>
            <p>किसी समर्थित प्लेटफ़ॉर्म का लिंक या अधिकृत सीधे वीडियो फ़ाइल URL लें।</p>
          </article>
          <article className="step-card">
            <span className="step-number">02</span>
            <div className="step-icon">⌕</div>
            <h3>लिंक जाँचें</h3>
            <p>लिंक पेस्ट करें और पुष्टि करें कि आपको वीडियो डाउनलोड करने का अधिकार है।</p>
          </article>
          <article className="step-card">
            <span className="step-number">03</span>
            <div className="step-icon">↓</div>
            <h3>उपलब्ध विकल्प देखें</h3>
            <p>सीधे वीडियो URL के लिए डाउनलोड आज़माएँ। स्रोत डाउनलोड रोक सकता है।</p>
          </article>
        </div>
      </section>

      <footer className="footer">
        <a className="brand footer-brand" href="/">Video<span className="brand-accent">Drop</span></a>
        <p>वीडियो कंटेंट के अधिकार उसके संबंधित मालिकों के पास रहते हैं।</p>
        <div className="footer-links">
          <a href="mailto:contact@example.com">संपर्क</a>
          <a href="#privacy">गोपनीयता</a>
          <a href="#terms">नियम एवं शर्तें</a>
        </div>
        <small>© VideoDrop · Browser download demo</small>
      </footer>
    </main>
  );
}


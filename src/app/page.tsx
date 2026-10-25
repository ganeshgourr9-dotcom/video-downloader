"use client";

import { useState } from "react";

type Platform = "YouTube" | "Instagram" | "Facebook";

export default function Home() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<Platform>("YouTube");
  const [message, setMessage] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");

  function detectPlatform(value: string): Platform | null {
    try {
      const parsed = new URL(value.trim());
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) return "YouTube";
      if (host === "instagram.com" || host.endsWith(".instagram.com")) return "Instagram";
      if (host === "facebook.com" || host === "fb.watch" || host.endsWith(".facebook.com")) return "Facebook";
      return null;
    } catch {
      return null;
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setOfficialUrl("");

    const value = url.trim();
    const detected = detectPlatform(value);

    if (!detected) {
      setMessage("कृपया YouTube, Instagram या Facebook का सही वीडियो लिंक डालें।");
      return;
    }

    if (detected !== platform) {
      setPlatform(detected);
    }

    setOfficialUrl(value);
    setMessage(
      "लिंक पहचान लिया गया। इस डेमो में सीधे वीडियो डाउनलोड उपलब्ध नहीं है। नीचे दिए बटन से मूल वीडियो खोलें।"
    );
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
          YouTube, Instagram या Facebook का वीडियो लिंक डालें।
          हम लिंक पहचानकर आपको आगे का सही विकल्प दिखाएँगे।
        </p>

        <div className="platforms" aria-label="Platform selection">
          {(["YouTube", "Instagram", "Facebook"] as Platform[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`platform ${platform === item ? "selected" : ""}`}
              onClick={() => {
                setPlatform(item);
                setMessage("");
                setOfficialUrl("");
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
                setMessage("");
                setOfficialUrl("");
              }}
              placeholder="https:// वीडियो लिंक यहाँ पेस्ट करें"
              autoComplete="url"
              required
            />
            {url && (
              <button className="clear-button" type="button" onClick={() => {
                setUrl("");
                setMessage("");
                setOfficialUrl("");
              }} aria-label="Clear link">×</button>
            )}
          </div>
          <button className="submit-button" type="submit">
            लिंक जाँचें <span>→</span>
          </button>
          <p className="privacy-note"><span>✓</span> कोई अकाउंट नहीं · कोई साइन-अप नहीं</p>
        </form>

        {message && (
          <div className="result" role="status">
            <strong>{officialUrl ? "लिंक मिल गया" : "लिंक जाँचें"}</strong>
            <p>{message}</p>
            {officialUrl && (
              <a className="official-button" href={officialUrl} target="_blank" rel="noopener noreferrer">
                मूल वीडियो खोलें ↗
              </a>
            )}
          </div>
        )}

        <p className="disclaimer">
          केवल सार्वजनिक लिंक होने से डाउनलोड की अनुमति सुनिश्चित नहीं होती।
          वीडियो के अधिकारों और प्लेटफॉर्म के नियमों का पालन करें।
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
            <h3>लिंक कॉपी करें</h3>
            <p>अपने चुने हुए प्लेटफॉर्म से वीडियो का लिंक लें।</p>
          </article>
          <article className="step-card">
            <span className="step-number">02</span>
            <div className="step-icon">⌕</div>
            <h3>लिंक जाँचें</h3>
            <p>लिंक पेस्ट करें। वेबसाइट प्लेटफॉर्म की पहचान करेगी।</p>
          </article>
          <article className="step-card">
            <span className="step-number">03</span>
            <div className="step-icon">↓</div>
            <h3>उपलब्ध विकल्प देखें</h3>
            <p>अधिकृत डाउनलोड उपलब्ध होने पर ही डाउनलोड विकल्प इस्तेमाल करें।</p>
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
        <small>© VideoDrop · Demo version</small>
      </footer>
    </main>
  );
}


import { useEffect, useState } from "react";
import "./App.css";

type Stock = {
  symbol: string;
  current_price: number;
  previous_close: number | null;
  volume: number | null;
  last_seen_at: string | null;
  price_change: number | null;
  price_status: string;
  observation_status: string;
  daily_return: number | null;
  volume_ratio: number | null;
  z_score: number | null;
  relative_movement: number | null;
  attention_score: number;
  explanation?: {
    headline: string;
    reasons: string[];
  };
};

type WatchlistResponse = {
  watchlist_id: number;
  watchlist_name: string;
  summary: {
    meaningful_changes: number;
    message: string;
  };
  stocks: Stock[];
  count: number;
};

function App() {
  const [data, setData] = useState<WatchlistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingSeen, setMarkingSeen] = useState(false);
  const [seenMessage, setSeenMessage] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/watchlists/1/changes")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load watchlist");
        }

        return response.json();
      })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);
  const markWatchlistSeen = async () => {
  setMarkingSeen(true);
  setSeenMessage("");

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/watchlists/1/mark-seen",
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      throw new Error("Failed to mark watchlist as seen");
    }

    await response.json();

    setSeenMessage("Watchlist marked as seen.");
  } catch (err) {
    setSeenMessage(
      err instanceof Error
        ? err.message
        : "Something went wrong.",
    );
  } finally {
    setMarkingSeen(false);
  }
};

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading your market watch...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const meaningfulStocks = data.stocks.filter(
    (stock) => stock.attention_score >= 30,
  );

  const normalStocks = data.stocks.filter(
    (stock) => stock.attention_score < 30,
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">M</div>

          <div>
            <h1>Smart Market Watch</h1>
            <span>Know what changed. Know why it matters.</span>
          </div>
        </div>

        <div className="profile">Y</div>
      </header>

      <main className="dashboard">
        <section className="hero">
          <p className="eyebrow">SINCE YOU WERE AWAY</p>

          <h2>Here's what changed.</h2>

          <p className="subtitle">
            We checked your watchlist and highlighted only the things
            that deserve your attention.
          </p>

          <div className="summary-card">
            <div>
              <span className="summary-label">WATCHLIST</span>
              <strong>{data.watchlist_name}</strong>
            </div>

            <div>
              <span className="summary-label">MEANINGFUL CHANGES</span>
              <strong>{data.summary.meaningful_changes}</strong>
            </div>

            <div>
              <span className="summary-label">STOCKS TRACKED</span>
              <strong>{data.count}</strong>
            </div>
          </div>
        </section>

        <section className="changes-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ATTENTION</p>
              <h3>Things worth a closer look</h3>
            </div>
          </div>

          {meaningfulStocks.length === 0 ? (
            <div className="empty-card">
              <div className="empty-icon">✓</div>

              <h3>You're all caught up</h3>

              <p>
                Nothing meaningful changed since your last visit.
              </p>
            </div>
          ) : (
            <div className="stock-list">
              {meaningfulStocks.map((stock) => (
                <StockCard key={stock.symbol} stock={stock} />
              ))}
            </div>
          )}
        </section>

        {normalStocks.length > 0 && (
          <section className="normal-section">
            <div className="normal-card">
              <div className="normal-icon">✓</div>

              <div>
                <strong>
                  {normalStocks.length}{" "}
                  {normalStocks.length === 1 ? "stock" : "stocks"} look
                  normal
                </strong>

                <p>
                  No unusual movement detected in the rest of your
                  watchlist.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="footer-action">
  <button
    className="watchlist-button"
    onClick={markWatchlistSeen}
    disabled={markingSeen}
  >
    {markingSeen ? "Marking as seen..." : "Mark watchlist as seen"}
    <span>✓</span>
  </button>

  {seenMessage && (
    <p className="seen-message">{seenMessage}</p>
  )}
</section>
      </main>
    </div>
  );
}

function StockCard({ stock }: { stock: Stock }) {
  const attentionClass =
    stock.attention_score >= 80
      ? "very-high"
      : stock.attention_score >= 60
        ? "high"
        : "moderate";

  const attentionLabel =
    stock.attention_score >= 80
      ? "VERY HIGH"
      : stock.attention_score >= 60
        ? "HIGH"
        : "MODERATE";

  const priceChange = stock.price_change ?? 0;

  return (
    <article className="stock-card">
      <div className="stock-card-top">
        <div>
          <span className="stock-symbol">{stock.symbol}</span>

          <div className="attention-row">
            <span className={`attention-dot ${attentionClass}`} />
            <span className={`attention-label ${attentionClass}`}>
              {attentionLabel} ATTENTION
            </span>
          </div>
        </div>

        <div className="attention-score">
          <span>ATTENTION</span>
          <strong>{stock.attention_score}</strong>
          <small>/100</small>
        </div>
      </div>

      <div className="price-row">
        <strong>₹{stock.current_price.toLocaleString("en-IN")}</strong>

        <span className={priceChange < 0 ? "negative" : "positive"}>
          {priceChange > 0 ? "+" : ""}
          {priceChange.toFixed(2)}%
        </span>
      </div>

      {stock.explanation && (
        <div className="explanation">
          <strong>{stock.explanation.headline}</strong>

          <ul>
            {stock.explanation.reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="stock-footer">
        <span>
          Daily return:{" "}
          {stock.daily_return !== null
            ? `${stock.daily_return.toFixed(2)}%`
            : "N/A"}
        </span>

        <span>
          Volume:{" "}
          {stock.volume_ratio !== null
            ? `${stock.volume_ratio.toFixed(2)}× normal`
            : "N/A"}
        </span>
      </div>
    </article>
  );
}

export default App;
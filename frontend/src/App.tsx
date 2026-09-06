import { useEffect, useState } from "react";
import "./App.css";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Stock = {
  symbol: string;
  current_price: number;
  previous_close: number | null;
  volume: number | null;
  last_seen_at: string | null;
  price_change: number | null;
  price_status: string;
  observation_status: string;
  is_stale: boolean;
  daily_return: number | null;
  volume_ratio: number | null;
  z_score: number | null;
  relative_movement: number | null;
  attention_score: number;
  attention_breakdown?: {
  price: number;
  unusualness: number;
  volume: number;
  relative: number;
  total: number;
};
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

type WatchlistManagementResponse = {
  watchlists: {
    id: number;
    name: string;
    stocks: string[];
    stock_count: number;
  }[];
  count: number;
};

type HistoryPoint = {
  datetime: string;
  close: number;
};

function App() {
  const [data, setData] = useState<WatchlistResponse | null>(null);

  const [watchlist, setWatchlist] =
    useState<WatchlistManagementResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [markingSeen, setMarkingSeen] = useState(false);
  const [seenMessage, setSeenMessage] = useState("");

  const [newStock, setNewStock] = useState("");
  const [addingStock, setAddingStock] = useState(false);
  const [removingStock, setRemovingStock] = useState("");
  const [managementMessage, setManagementMessage] = useState("");

  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

  const [stockHistory, setStockHistory] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadDashboard = async () => {
    const response = await fetch(
      "http://127.0.0.1:8000/api/watchlists/1/changes",
    );

    if (!response.ok) {
      throw new Error("Failed to load watchlist");
    }

    const result = await response.json();

    setData(result);
  };

  const loadWatchlist = async () => {
    const response = await fetch(
      "http://127.0.0.1:8000/api/watchlists?user_id=2",
    );

    if (!response.ok) {
      throw new Error(
        "Failed to load watchlist management data",
      );
    }

    const result = await response.json();

    setWatchlist(result);
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([
        loadDashboard(),
        loadWatchlist(),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const addStock = async () => {
    const symbol = newStock.trim().toUpperCase();

    if (!symbol) {
      setManagementMessage("Enter a stock symbol.");
      return;
    }

    setAddingStock(true);
    setManagementMessage("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/watchlists/1/stocks?user_id=2",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || "Failed to add stock",
        );
      }

      setNewStock("");

      setManagementMessage(
        `${symbol} added to your watchlist.`,
      );

      await loadWatchlist();
      await loadDashboard();
    } catch (err) {
      setManagementMessage(
        err instanceof Error
          ? err.message
          : "Failed to add stock.",
      );
    } finally {
      setAddingStock(false);
    }
  };

  const removeStock = async (symbol: string) => {
    setRemovingStock(symbol);
    setManagementMessage("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/watchlists/1/stocks/${encodeURIComponent(
          symbol,
        )}?user_id=2`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || "Failed to remove stock",
        );
      }

      setManagementMessage(
        `${symbol} removed from your watchlist.`,
      );

      await loadWatchlist();
      await loadDashboard();
    } catch (err) {
      setManagementMessage(
        err instanceof Error
          ? err.message
          : "Failed to remove stock.",
      );
    } finally {
      setRemovingStock("");
    }
  };

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
        throw new Error(
          "Failed to mark watchlist as seen",
        );
      }

      await response.json();

      setSeenMessage("Watchlist marked as seen.");

      await loadDashboard();
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

  const openStockDetails = async (symbol: string) => {
    setStockLoading(true);
    setSelectedStock(null);
    setStockHistory([]);
    setHistoryLoading(false);
    setError("");

    try {
      /*
       * STEP 1:
       * Load stock details.
       */
      const response = await fetch(
        `http://localhost:8000/api/stocks/${encodeURIComponent(
          symbol,
        )}?user_id=2`,
      );

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          `Failed to load stock details (${response.status}): ${errorText}`,
        );
      }

      const result = await response.json();

      setSelectedStock(result);

      /*
       * STEP 2:
       * Load historical price data.
       */
      setHistoryLoading(true);

      try {
        const historyResponse = await fetch(
          `http://localhost:8000/api/stocks/${encodeURIComponent(
            symbol,
          )}/history`,
        );

        if (historyResponse.ok) {
          const historyResult =
            await historyResponse.json();

          setStockHistory(
            historyResult.history.map(
              (item: {
                datetime: string;
                close: number;
              }) => ({
                datetime: item.datetime,
                close: item.close,
              }),
            ),
          );
        }
      } finally {
        setHistoryLoading(false);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load stock details.",
      );
    } finally {
      setStockLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          Loading your market watch...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Something went wrong</h2>

          <p>{error}</p>

          <button onClick={loadAllData}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data || !watchlist) {
    return null;
  }

  const currentWatchlist =
    watchlist.watchlists.find(
      (item) => item.id === 1,
    );

  const meaningfulStocks = data.stocks.filter(
    (stock) => stock.attention_score >= 30,
  );

  const normalStocks = data.stocks.filter(
    (stock) => stock.attention_score < 30,
  );

  return (
    <div className="app">

      {/* TOP BAR */}
      <header className="topbar">
        <div className="brand">

          <div className="brand-mark">
            M
          </div>

          <div>
            <h1>
              Smart Market Watch
            </h1>

            <span>
              Know what changed. Know why it matters.
            </span>
          </div>

        </div>

        <div className="profile">
          Y
        </div>
      </header>


      <main className="dashboard">

        {/* =====================================================
            STOCK DETAILS
        ====================================================== */}

        {stockLoading && (
          <div className="loading">
            Loading stock details...
          </div>
        )}

        {selectedStock && (
          <section className="stock-details">

            {/* BACK BUTTON */}
            <button
              className="back-button"
              onClick={() => {
                setSelectedStock(null);
                setStockHistory([]);
              }}
            >
              ← Back to Watchlist
            </button>
            {selectedStock.is_stale && (
  <div className="stale-warning">
    ⚠️ Market data may be delayed or stale. Showing the last verified value.
  </div>
)}


            {/* STOCK HEADER */}
            <div className="stock-details-header">

              <div>
                <h2>
                  {selectedStock.symbol}
                </h2>

                <span className="detail-observation-status">
                  {selectedStock.observation_status}
                </span>
              </div>


              <div className="stock-detail-price">

                <strong>
                  ₹
                  {selectedStock.current_price.toLocaleString(
                    "en-IN",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                </strong>

                <span
                  className={
                    (selectedStock.price_change ?? 0) < 0
                      ? "negative"
                      : "positive"
                  }
                >
                  {selectedStock.price_change !== null
                    ? `${
                        selectedStock.price_change >= 0
                          ? "+"
                          : ""
                      }${selectedStock.price_change.toFixed(
                        2,
                      )}%`
                    : "—"}
                </span>

              </div>

            </div>


            {/* ATTENTION SCORE */}
            <div className="detail-score">

              <span>
                ATTENTION SCORE
              </span>

              <strong>
                {selectedStock.attention_score}
              </strong>

              <small>
                /100
              </small>

            </div>
            <div className="score-breakdown">
  <div className="score-breakdown-header">
    <span className="eyebrow">HOW THE SCORE IS BUILT</span>
    <strong>{selectedStock.attention_score} / 100</strong>
  </div>

  <div className="score-breakdown-row">
  <span>Price movement</span>
  <strong>
    {selectedStock.attention_breakdown?.price ?? 0} / 35 pts
  </strong>
</div>

<div className="score-breakdown-row">
  <span>Unusualness</span>
  <strong>
    {selectedStock.attention_breakdown?.unusualness ?? 0} / 35 pts
  </strong>
</div>

<div className="score-breakdown-row">
  <span>Volume anomaly</span>
  <strong>
    {selectedStock.attention_breakdown?.volume ?? 0} / 20 pts
  </strong>
</div>

<div className="score-breakdown-row">
  <span>Market-relative movement</span>
  <strong>
    {selectedStock.attention_breakdown?.relative ?? 0} / 10 pts
  </strong>
</div>
</div>
            {/* PRICE HISTORY */}
            <div className="price-chart-section">

              <div className="chart-heading">

                <div>
                  <p className="eyebrow">
                    PRICE HISTORY
                  </p>

                  <h3>
                    Last 30 trading days
                  </h3>
                </div>

              </div>


              {historyLoading ? (
                <div className="history-loading">
                  Loading price history...
                </div>
              ) : stockHistory.length > 0 ? (

                <div className="price-chart">

                  <ResponsiveContainer
                    width="100%"
                    height={300}
                  >
                    <LineChart
                      data={stockHistory}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 0,
                      }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#eceef1"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="datetime"
                        tickFormatter={(value) => {
                          const date =
                            new Date(value);

                          return date.toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                            },
                          );
                        }}
                        tick={{
                          fill: "#858b98",
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={28}
                      />

                      <YAxis
                        domain={[
                          "auto",
                          "auto",
                        ]}
                        tickFormatter={(value) =>
                          `₹${value}`
                        }
                        tick={{
                          fill: "#858b98",
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={70}
                      />

                    <Tooltip
  labelFormatter={(label) => {
    const date = new Date(String(label));

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }}
  formatter={(value) => [
    `₹${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    "Close",
  ]}
/>

                      <Line
                        type="monotone"
                        dataKey="close"
                        stroke="#1677ff"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{
                          r: 5,
                        }}
                      />

                    </LineChart>
                  </ResponsiveContainer>

                </div>

              ) : (

                <div className="history-empty">
                  Price history is currently unavailable.
                </div>

              )}

            </div>


            {/* WHY THIS MATTERS */}
            {selectedStock.explanation && (
              <div className="detail-explanation">

                <p className="eyebrow">
                  WHY THIS MATTERS
                </p>

                <h3>
                  {selectedStock.explanation.headline}
                </h3>

                <ul>
                  {selectedStock.explanation.reasons.map(
                    (reason, index) => (
                      <li key={index}>
                        {reason}
                      </li>
                    ),
                  )}
                </ul>

              </div>
            )}


            {/* DETAILS METRICS */}
            <div className="detail-metrics">

              <div className="detail-metric">

                <span>
                  Daily Return
                </span>

                <strong>
                  {selectedStock.daily_return !== null
                    ? `${selectedStock.daily_return.toFixed(
                        2,
                      )}%`
                    : "N/A"}
                </strong>

              </div>


              <div className="detail-metric">

                <span>
                  Volume
                </span>

                <strong>
                  {selectedStock.volume_ratio !== null
                    ? `${selectedStock.volume_ratio.toFixed(
                        2,
                      )}× normal`
                    : "N/A"}
                </strong>

              </div>


              <div className="detail-metric">

                <span>
                  Z-Score
                </span>

                <strong>
                  {selectedStock.z_score !== null
                    ? selectedStock.z_score.toFixed(2)
                    : "N/A"}
                </strong>

              </div>


              <div className="detail-metric">

                <span>
                  Previous Close
                </span>

                <strong>
                  {selectedStock.previous_close !== null
                    ? `₹${selectedStock.previous_close.toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}`
                    : "N/A"}
                </strong>

              </div>

            </div>


            {/* LAST SEEN */}
            {selectedStock.last_seen_at && (
              <div className="last-seen-detail">

                Last seen:{" "}

                {new Date(
                  selectedStock.last_seen_at,
                ).toLocaleString("en-IN")}

              </div>
            )}

          </section>
        )}


        {/* =====================================================
            WATCHLIST MANAGEMENT
        ====================================================== */}

        <section className="watchlist-management">

          <div className="section-heading">

            <div>

              <p className="eyebrow">
                YOUR WATCHLIST
              </p>

              <h3>
                {currentWatchlist?.name ||
                  "My Watchlist"}
              </h3>

            </div>


            <span className="stock-count">
              {currentWatchlist?.stock_count || 0} stocks
            </span>

          </div>


          {/* ADD STOCK */}
          <div className="add-stock-row">

            <input
              type="text"
              placeholder="Enter stock symbol e.g. RELIANCE"
              value={newStock}
              onChange={(event) =>
                setNewStock(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  addStock();
                }
              }}
            />


            <button
              onClick={addStock}
              disabled={addingStock}
            >
              {addingStock
                ? "Adding..."
                : "Add stock"}
            </button>

          </div>


          {/* MANAGEMENT MESSAGE */}
          {managementMessage && (
            <p className="management-message">
              {managementMessage}
            </p>
          )}


          {/* MANAGED STOCK LIST */}
          <div className="managed-stock-list">

            {currentWatchlist?.stocks.map(
              (symbol) => (

                <div
                  className="managed-stock"
                  key={symbol}
                >

                  <div>

                    <strong>
                      {symbol}
                    </strong>

                    <span>
                      Tracked in your watchlist
                    </span>

                  </div>


                  <button
                    className="remove-stock"
                    onClick={() =>
                      removeStock(symbol)
                    }
                    disabled={
                      removingStock === symbol
                    }
                  >
                    {removingStock === symbol
                      ? "Removing..."
                      : "Remove"}
                  </button>

                </div>

              ),
            )}

          </div>

        </section>


        {/* =====================================================
            SINCE YOU WERE AWAY
        ====================================================== */}

        <section className="hero">
  <p className="eyebrow">SMART MARKET WATCH</p>

  <h1>Since You Were Away</h1>

  <h2>
    {data.summary.meaningful_changes === 0
      ? "You're all caught up."
      : `${data.summary.meaningful_changes} thing${
          data.summary.meaningful_changes === 1 ? "" : "s"
        } deserve your attention.`}
  </h2>

  <p className="subtitle">
    We checked your watchlist and highlighted only the changes
    that matter.
  </p>

  <div className="summary-card">
    <div>
      <span className="summary-label">WATCHLIST</span>
      <strong>{data.watchlist_name}</strong>
    </div>

    <div>
      <span className="summary-label">NEEDS ATTENTION</span>
      <strong>{data.summary.meaningful_changes}</strong>
    </div>

    <div>
      <span className="summary-label">STOCKS TRACKED</span>
      <strong>{data.count}</strong>
    </div>
  </div>
</section>

        {/* =====================================================
            MEANINGFUL CHANGES
        ====================================================== */}

        <section className="changes-section">

          <div className="section-heading">

            <div>

              <p className="eyebrow">
                ATTENTION
              </p>

              <h3>
                Things worth a closer look
              </h3>

            </div>

          </div>


          {meaningfulStocks.length === 0 ? (

            <div className="empty-card">

              <div className="empty-icon">
                ✓
              </div>

              <h3>
                You're all caught up
              </h3>

              <p>
                Nothing meaningful changed since your
                last visit.
              </p>

            </div>

          ) : (

            <div className="stock-list">

              {meaningfulStocks.map(
                (stock) => (

                  <StockCard
                    key={stock.symbol}
                    stock={stock}
                    onOpen={openStockDetails}
                  />

                ),
              )}

            </div>

          )}

        </section>


        {/* =====================================================
            NORMAL STOCKS
        ====================================================== */}

        {normalStocks.length > 0 && (

          <section className="normal-section">

            <div className="normal-card">

              <div className="normal-icon">
                ✓
              </div>


              <div>

                <strong>

                  {normalStocks.length}{" "}

                  {normalStocks.length === 1
                    ? "stock"
                    : "stocks"}{" "}

                  look normal

                </strong>


                <p>
                  No unusual movement detected in the
                  rest of your watchlist.
                </p>

              </div>

            </div>

          </section>

        )}


        {/* =====================================================
            MARK WATCHLIST AS SEEN
        ====================================================== */}

        <section className="footer-action">

          <button
            className="watchlist-button"
            onClick={markWatchlistSeen}
            disabled={markingSeen}
          >

            {markingSeen
              ? "Marking as seen..."
              : "Mark watchlist as seen"}

            <span>
              ✓
            </span>

          </button>


          {seenMessage && (
            <p className="seen-message">
              {seenMessage}
            </p>
          )}

        </section>

      </main>

    </div>
  );
}


/* =========================================================
   STOCK CARD
========================================================= */

function StockCard({
  stock,
  onOpen,
}: {
  stock: Stock;
  onOpen: (symbol: string) => void;
}) {

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


  const priceChange =
    stock.price_change ?? 0;


  return (

    <article
      className="stock-card"
      onClick={() =>
        onOpen(stock.symbol)
      }
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          onOpen(stock.symbol);
        }

      }}
    >

      {/* CARD TOP */}
      <div className="stock-card-top">

        <div>

          <span className="stock-symbol">
            {stock.symbol}
          </span>


          <div className="attention-row">

            <span
              className={`attention-dot ${attentionClass}`}
            />


            <span
              className={`attention-label ${attentionClass}`}
            >
              {attentionLabel} ATTENTION
            </span>

          </div>

        </div>


        <div className="attention-score">

          <span>
            ATTENTION
          </span>

          <strong>
            {stock.attention_score}
          </strong>

          <small>
            /100
          </small>

        </div>

      </div>


      {/* PRICE */}
      <div className="price-row">

        <strong>
          ₹
          {stock.current_price.toLocaleString(
            "en-IN",
          )}
        </strong>


        <span
          className={
            priceChange < 0
              ? "negative"
              : "positive"
          }
        >

          {priceChange > 0
            ? "+"
            : ""}

          {priceChange.toFixed(2)}%

        </span>

      </div>


      {/* EXPLANATION */}
      {stock.explanation && (

        <div className="explanation">

          <strong>
            {stock.explanation.headline}
          </strong>


          <ul>

            {stock.explanation.reasons.map(
              (reason, index) => (

                <li key={index}>
                  {reason}
                </li>

              ),
            )}

          </ul>

        </div>

      )}


      {/* CARD METRICS */}
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


      {/* CARD ACTION */}
      <div className="card-action">

        Click to view details →

      </div>

    </article>
  );
}


export default App;
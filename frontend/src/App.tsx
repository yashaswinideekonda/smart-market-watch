import { useEffect, useState } from "react";
import "./App.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
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
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userId, setUserId] = useState<number | null>(() => {
  const savedUserId = localStorage.getItem("smart_market_user_id");
  return savedUserId ? Number(savedUserId) : null;
});
  const [showSignup, setShowSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
  if (!userId) return;

  const watchlistsResponse = await fetch(
    API_BASE + `/api/watchlists?user_id=${userId}`,
  );

  if (!watchlistsResponse.ok) {
    throw new Error("Failed to load watchlists");
  }

  const watchlistsResult = await watchlistsResponse.json();

  if (!watchlistsResult.watchlists?.length) {
    throw new Error("No watchlist found");
  }


  const response = await fetch(
    API_BASE + `/api/watchlists/1/changes?user_id=${userId}`,
  );

  if (!response.ok) {
    throw new Error("Failed to load watchlist");
  }

  const result = await response.json();

  setData(result);
};

  const loadWatchlist = async () => {
  if (!userId) return;

  const response = await fetch(
   API_BASE + `/api/watchlists?user_id=${userId}`,
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
  if (userId) {
    loadAllData();
  }
}, [userId]);

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
        API_BASE + `/api/watchlists/1/stocks?user_id=${userId}`,
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
       API_BASE + `/api/watchlists/1/stocks/${encodeURIComponent(
  symbol,
)}?user_id=${userId}`,
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
        API_BASE + `/api/watchlists/1/mark-seen?user_id=${userId}`,
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
  API_BASE + `/api/stocks/${encodeURIComponent(
    symbol,
  )}?user_id=${userId}`,
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
  API_BASE + `/api/stocks/${encodeURIComponent(
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
    if (!isLoggedIn) {
    return (
      <div className="auth-page">
        <div className="auth-brand">
          <div className="auth-logo">M</div>
          <span>Smart Market Watch</span>
        </div>

        <div className="auth-card">
          <div className="auth-intro">
            <p className="eyebrow">SMART MARKET WATCH</p>

            <h1>
              Know what changed.
              <br />
              Know why it matters.
            </h1>

            <p>
              Your intelligent watchlist that highlights the
              market movements worth your attention.
            </p>
          </div>

          <div className="auth-form">
            <h2>
              {showSignup ? "Create your account" : "Welcome back"}
            </h2>

            <p className="auth-subtitle">
              {showSignup
                ? "Start tracking the market smarter."
                : "Sign in to continue to your watchlist."}
            </p>

            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <button
              className="auth-button"
              onClick={async () => {
  try {
    const response = await fetch(
       API_BASE + (showSignup ? "/api/auth/signup" : "/api/auth/login"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      alert(result.detail || "Login failed");
      return;
    }

    localStorage.setItem(
      "smart_market_user_id",
      String(result.user_id),
    );

    setUserId(result.user_id);
    setIsLoggedIn(true);
  } catch (error) {
    console.error(error);
    alert("Unable to connect to the server");
  }
}}
            >
              {showSignup ? "Create account" : "Sign in"} →
            </button>

            <p className="auth-switch">
              {showSignup
                ? "Already have an account?"
                : "New to Smart Market Watch?"}

              <button
                type="button"
                onClick={() => setShowSignup(!showSignup)}
              >
                {showSignup ? " Sign in" : " Create account"}
              </button>
            </p>
          </div>
        </div>

        <p className="auth-footer">
          Built for smarter market awareness · Not investment advice
        </p>
      </div>
    );
  }

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

    <div className="brand-copy">
      <h1>
        Smart Market Watch
      </h1>

      <span>
        Know what changed. Know why it matters.
      </span>
    </div>

  </div>

  <div className="topbar-right">

    <div className="market-status">
  <span className="status-dot"></span>

  {new Date().getHours() >= 9 &&
  new Date().getHours() < 16
    ? "Market Open"
    : "Market Closed"}
</div>

    <div className="profile">
      Y
    </div>

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

        {/* ANALYTICS OVERVIEW */}
        <section className="analytics-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">MARKET ANALYTICS</p>
              <h3>Watchlist intelligence</h3>
            </div>
            <span className="stock-count">
              Live portfolio view
            </span>
          </div>

          <div className="analytics-grid">
            <div className="analytics-card">
              <span>Stocks tracked</span>
              <strong>{data.stocks.length}</strong>
              <small>Your active watchlist</small>
            </div>

            <div className="analytics-card">
              <span>Meaningful changes</span>
              <strong>{meaningfulStocks.length}</strong>
              <small>Worth a closer look</small>
            </div>

            <div className="analytics-card">
              <span>Average attention</span>
              <strong>
                {data.stocks.length
                  ? Math.round(
                      data.stocks.reduce(
                        (sum, stock) => sum + stock.attention_score,
                        0,
                      ) / data.stocks.length,
                    )
                  : 0}
              </strong>
              <small>Out of 100</small>
            </div>

            <div className="analytics-card">
              <span>Highest attention</span>
              <strong>
                {data.stocks.length
                  ? Math.max(
                      ...data.stocks.map(
                        (stock) => stock.attention_score,
                      ),
                    )
                  : 0}
              </strong>
              <small>Needs closest review</small>
            </div>
          </div>

          <div className="attention-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ATTENTION RANKING</p>
                <h3>What deserves attention?</h3>
              </div>
            </div>

            {[...data.stocks]
              .sort(
                (a, b) =>
                  b.attention_score - a.attention_score,
              )
              .map((stock) => (
                <div
                  className="attention-row"
                  key={stock.symbol}
                  onClick={() =>
                    openStockDetails(stock.symbol)
                  }
                >
                  <strong>{stock.symbol}</strong>

                  <div className="attention-bar">
                    <div
                      className="attention-fill"
                      style={{
                        width: `${stock.attention_score}%`,
                      }}
                    />
                  </div>

                  <span>
                    {stock.attention_score}/100
                  </span>
                </div>
              ))}
          </div>
        </section>

        {/* ANALYTICS OVERVIEW */}
        <section className="analytics-overview">
          <div className="section-heading">
            <div>
              <p className="eyebrow">MARKET ANALYTICS</p>
              <h3>Watchlist intelligence</h3>
            </div>
            <span className="stock-count">
              Live portfolio view
            </span>
          </div>

          <div className="analytics-grid">
            <div className="analytics-card">
              <span>Stocks tracked</span>
              <strong>{data.stocks.length}</strong>
              <small>Your active watchlist</small>
            </div>

            <div className="analytics-card">
              <span>Meaningful changes</span>
              <strong>{meaningfulStocks.length}</strong>
              <small>Worth a closer look</small>
            </div>

            <div className="analytics-card">
              <span>Average attention</span>
              <strong>
                {data.stocks.length
                  ? Math.round(
                      data.stocks.reduce(
                        (sum, stock) => sum + stock.attention_score,
                        0,
                      ) / data.stocks.length,
                    )
                  : 0}
              </strong>
              <small>Out of 100</small>
            </div>

            <div className="analytics-card">
              <span>Highest attention</span>
              <strong>
                {data.stocks.length
                  ? Math.max(
                      ...data.stocks.map(
                        (stock) => stock.attention_score,
                      ),
                    )
                  : 0}
              </strong>
              <small>Needs closest review</small>
            </div>
          </div>

          <div className="attention-ranking">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ATTENTION RANKING</p>
                <h3>What deserves attention?</h3>
              </div>
            </div>

            {[...data.stocks]
              .sort(
                (a, b) =>
                  b.attention_score - a.attention_score,
              )
              .map((stock) => (
                <div
                  className="attention-row"
                  key={stock.symbol}
                  onClick={() =>
                    openStockDetails(stock.symbol)
                  }
                >
                  <strong>{stock.symbol}</strong>

                  <div className="attention-bar">
                    <div
                      className="attention-fill"
                      style={{
                        width: `${stock.attention_score}%`,
                      }}
                    />
                  </div>

                  <span>
                    {stock.attention_score}/100
                  </span>
                </div>
              ))}
          </div>
        </section>

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

      <div className="normal-content">

        <div className="normal-title-row">

          <strong>
            {normalStocks.length}{" "}
            {normalStocks.length === 1
              ? "stock"
              : "stocks"}{" "}
            look normal
          </strong>

          <span className="normal-badge">
            LOW ATTENTION
          </span>

        </div>

        <p>
          No unusual movement detected in the
          rest of your watchlist.
        </p>

      </div>

      <span className="normal-arrow">
        →
      </span>

    </div>

  </section>

)}

        {/* =====================================================
            MARK WATCHLIST AS SEEN
        ====================================================== */}
<section className="demo-section">

  <div className="demo-card">

    <div className="demo-icon">
      ⚡
    </div>

    <div className="demo-content">
      <span className="demo-label">
        DEMO MODE
      </span>

      <strong>
        Simulate a meaningful market change
      </strong>

      <p>
        See how Smart Market Watch detects,
        scores and explains an unusual movement.
      </p>
    </div>

    <button
  className="demo-button"
  onClick={async () => {
    try {
      await fetch(
  API_BASE + `/api/demo/watchlists/${data.watchlist_id}/simulate-change?user_id=${userId}`,
  {
    method: "POST",
  },
);

      await loadAllData();
    } catch (error) {
      console.error(error);
    }
  }}
>
  Simulate change →
</button>

  </div>

</section>
        <section className="footer-action">

  <div className="seen-card">

    <div className="seen-icon">
      ✓
    </div>

    <div className="seen-content">

      <strong>
        Finished reviewing?
      </strong>

      <p>
        Save this moment as your new baseline.
        We'll compare future visits against it.
      </p>

    </div>

    <button
      className="watchlist-button"
      onClick={markWatchlistSeen}
      disabled={markingSeen}
    >
      {markingSeen
        ? "Saving..."
        : "Mark as seen"}

      <span>✓</span>
    </button>

  </div>

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
        : stock.attention_score >= 30
          ? "moderate"
          : "normal";

  const attentionLabel =
    stock.attention_score >= 80
      ? "VERY HIGH"
      : stock.attention_score >= 60
        ? "HIGH"
        : stock.attention_score >= 30
          ? "MODERATE"
          : "NORMAL";

  const priceChange = stock.price_change ?? 0;

  return (
    <article
      className={`stock-card stock-card-${attentionClass}`}
      onClick={() => onOpen(stock.symbol)}
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
      {/* TOP */}
      <div className="stock-card-top">

        <div>
          <div className="stock-symbol-row">
            <span className="stock-symbol">
              {stock.symbol}
            </span>

            <span
              className={`attention-pill ${attentionClass}`}
            >
              <span className="attention-dot" />
              {attentionLabel}
            </span>
          </div>

          <div className="stock-status-text">
            {attentionClass === "very-high"
              ? "Unusual movement detected"
              : attentionClass === "high"
                ? "Worth a closer look"
                : attentionClass === "moderate"
                  ? "Some movement to watch"
                  : "Moving within normal range"}
          </div>
        </div>

        <div className={`attention-score ${attentionClass}`}>
          <span>SCORE</span>

          <strong>
            {stock.attention_score}
          </strong>

          <small>/100</small>
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
          {priceChange > 0 ? "+" : ""}
          {priceChange.toFixed(2)}%
        </span>

      </div>


      {/* EXPLANATION */}
      {stock.explanation && (
        <div className="explanation">

          <div className="explanation-heading">
            <span className="explanation-icon">
              ✦
            </span>

            <strong>
              {stock.explanation.headline}
            </strong>
          </div>

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


      {/* METRICS */}
      <div className="stock-footer">

        <div className="stock-metric">
          <span>DAILY RETURN</span>

          <strong
            className={
              (stock.daily_return ?? 0) < 0
                ? "negative"
                : "positive"
            }
          >
            {stock.daily_return !== null
              ? `${stock.daily_return.toFixed(2)}%`
              : "N/A"}
          </strong>
        </div>

        <div className="stock-metric">
          <span>VOLUME</span>

          <strong>
            {stock.volume_ratio !== null
              ? `${stock.volume_ratio.toFixed(2)}×`
              : "N/A"}
          </strong>
        </div>

      </div>


      {/* ACTION */}
      <div className="card-action">
        <span>
          View what changed
        </span>

        <strong>
          →
        </strong>
      </div>

    </article>
  );
}


export default App;

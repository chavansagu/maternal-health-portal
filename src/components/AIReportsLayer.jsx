import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { aiReportsAPI } from '../services/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const BG_COLORS = [
  'rgba(54,162,235,0.6)','rgba(255,99,132,0.6)','rgba(75,192,192,0.6)',
  'rgba(255,206,86,0.6)','rgba(153,102,255,0.6)','rgba(255,159,64,0.6)',
  'rgba(199,199,199,0.6)','rgba(83,102,255,0.6)','rgba(255,99,255,0.6)','rgba(99,255,132,0.6)'
];
const BD_COLORS = BG_COLORS.map(c => c.replace('0.6', '1'));

const AIChart = ({ visualization }) => {
  if (!visualization) return null;
  const { type, config } = visualization;
  if (!type || !config) return null;

  if (type === 'metric') {
    return (
      <div className="text-center p-4 bg-primary-50 rounded mt-3">
        <h2 className="text-primary mb-1">{config.value}</h2>
        <p className="mb-0 text-secondary-light">{config.label}</p>
      </div>
    );
  }

  // table type — data already shown in table above
  if (type === 'table') return null;

  if (!['bar','line','pie','doughnut'].includes(type)) return null;
  if (!config.labels?.length || !config.values?.length) return null;

  const chartData = {
    labels: config.labels,
    datasets: [{
      label: config.yAxis?.label || 'Value',
      data: config.values,
      backgroundColor: BG_COLORS.slice(0, config.values.length),
      borderColor: BD_COLORS.slice(0, config.values.length),
      borderWidth: 1,
    }]
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: type === 'pie' || type === 'doughnut', position: 'top' },
      title: { display: !!config.title, text: config.title, font: { size: 14, weight: 'bold' } },
    },
    ...(type === 'bar' || type === 'line' ? { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } : {})
  };

  const ChartComp = { bar: Bar, line: Line, pie: Pie, doughnut: Doughnut }[type] || Bar;
  return (
    <div className="mt-3" style={{ height: 320 }}>
      <ChartComp data={chartData} options={options} />
    </div>
  );
};

const AIReportsLayer = () => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Format timestamp for history sidebar
  const formatHistoryTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (itemDate.getTime() === today.getTime()) {
      // Today - show time
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (itemDate.getTime() === yesterday.getTime()) {
      // Yesterday
      return 'Yesterday';
    } else {
      // Older - show date
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await aiReportsAPI.getHistory(null, null, 0, 20);
      setHistory(res.history || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;

    const userQuestion = question;
    setLoading(true);
    setQuestion('');
    setSelectedHistoryId(null);

    const newConversation = {
      id: Date.now(),
      question: userQuestion,
      response: null,
      loading: true,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    setConversations([newConversation]);

    try {
      // Step 1: Submit question — returns job_id instantly (no timeout risk)
      const submitRes = await aiReportsAPI.ask(userQuestion);
      const jobId = submitRes.job_id;

      // Step 2: Poll every 4 seconds until completed or failed
      const poll = async () => {
        try {
          const statusRes = await aiReportsAPI.getJobStatus(jobId);

          if (statusRes.status === 'processing') {
            // Still running — poll again after 4s
            setTimeout(poll, 4000);
            return;
          }

          // completed or failed
          setLoading(false);

          if (statusRes.status === 'completed') {
            setConversations([{ ...newConversation, response: statusRes, loading: false }]);
          } else {
            setConversations([{ ...newConversation, error: statusRes.message || 'AI processing failed', loading: false }]);
          }

          loadHistory();
        } catch (pollErr) {
          setLoading(false);
          setConversations([{ ...newConversation, error: 'Failed to get result. Please try again.', loading: false }]);
        }
      };

      // Start polling after 4s (give Ollama a head start)
      setTimeout(poll, 4000);

    } catch (err) {
      setLoading(false);
      const detail = err.response?.data?.detail;
      let errorMsg = 'Error processing question';

      if (Array.isArray(detail)) {
        errorMsg = detail.map(e =>
          typeof e === 'object' && e.msg
            ? `${e.loc ? e.loc.join(' -> ') + ': ' : ''}${e.msg}`
            : JSON.stringify(e)
        ).join(', ');
      } else if (typeof detail === 'string') {
        errorMsg = detail;
      }

      setConversations([{ ...newConversation, error: errorMsg, loading: false }]);
    }
  };

  const loadHistoryItem = (item) => {
    setSelectedHistoryId(item.id);
    const conv = {
      id: item.id,
      question: item.question,
      response: item.success ? {
        data: item.data,
        visualization: item.visualization,
        result_count: item.result_count,
        execution_time_ms: item.execution_time_ms,
        optimized_sql: item.generated_sql
      } : null,
      error: item.error_message,
      loading: false,
      timestamp: new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    setConversations([conv]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleAsk();
    }
  };

  const exampleQuestions = [
    'How many pregnant women are registered?',
    'Show pregnant women by block',
    'Total USG appointments',
    'High risk cases distribution',
    'Appointments trend by month'
  ];

  const clearConversation = () => {
    setConversations([]);
    setSelectedHistoryId(null);
  };

  return (
    <div className="chat-wrapper" style={{ display: 'flex', flexDirection: 'row-reverse' }}>
      {/* Right Sidebar - History */}
      <div className={`chat-sidebar card ${sidebarCollapsed ? 'd-none' : ''}`} style={{ backgroundColor: '#fff', color: '#333' }}>
        <div className="chat-sidebar-single active top-profile">
          <div className="img">
            <Icon icon="mdi:robot-outline" className="text-primary-600" style={{ fontSize: '40px' }} />
          </div>
          <div className="info">
            <h6 className="text-md mb-0">AI Assistant</h6>
            <p className="mb-0">Ask anything</p>
          </div>
          <div className="action">
            <button 
              type="button" 
              className="reload-button text-secondary-light text-xl d-flex"
              onClick={loadHistory}
              title="Refresh history"
            >
              <Icon icon="tabler:reload" className="icon" />
            </button>
          </div>
        </div>

        <div className="chat-all-list">
          {loadingHistory ? (
            <div className="text-center py-3">
              <span className="spinner-border spinner-border-sm" role="status"></span>
              <p className="text-sm mt-2 mb-0">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-3" style={{ color: '#888' }}>
              <Icon icon="mdi:message-outline" style={{ fontSize: '2rem', marginBottom: 8 }} />
              <p className="text-sm mb-0">No history in last 7 days</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id} 
                className={`chat-sidebar-single ${selectedHistoryId === item.id ? 'active' : ''}`}
                onClick={() => loadHistoryItem(item)}
                style={{ cursor: 'pointer' }}
              >
                <div className="img">
                  <Icon 
                    icon={item.success ? "mdi:check-circle" : "mdi:alert-circle"} 
                    className={item.success ? "text-success" : "text-danger"} 
                    style={{ fontSize: '24px' }} 
                  />
                </div>
                <div className="info">
                  <h6 className="text-sm mb-1" style={{ color: '#333' }}>{item.question.substring(0, 35)}...</h6>
                  <p className="mb-0 text-xs" style={{ color: '#666' }}>
                    {item.success ? `${item.result_count} results` : 'Error'}
                  </p>
                </div>
                <div className="action text-end">
                  <p className="mb-0 text-xs lh-1" style={{ color: '#999' }}>
                    {formatHistoryTime(item.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Left Main Area - Chat */}
      <div className="chat-main card" style={{ flex: sidebarCollapsed ? '1' : undefined }}>
        <div className="chat-sidebar-single active">
          <div className="img">
            <Icon icon="mdi:robot-outline" className="text-primary-600" style={{ fontSize: '40px' }} />
          </div>
          <div className="info">
            <h6 className="text-md mb-0">AI Reports Assistant</h6>
            <p className="mb-0">Ask questions in natural language</p>
          </div>
          <div className="action d-inline-flex align-items-center gap-3">
            <button 
              type="button" 
              className="text-xl text-primary-light"
              onClick={clearConversation}
              title="New conversation"
            >
              <Icon icon="mdi:plus" />
            </button>
            <button 
              type="button" 
              className="text-xl text-primary-light"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Show history" : "Hide history"}
            >
              <Icon icon={sidebarCollapsed ? "mdi:menu" : "mdi:menu-open"} />
            </button>
          </div>
        </div>

        <div className="chat-message-list">
          {conversations.length === 0 ? (
            <div className="text-center py-5">
              <Icon icon="mdi:robot-outline" className="text-primary-600" style={{ fontSize: '80px' }} />
              <h5 className="mb-3 mt-3">Welcome to AI Reports</h5>
              <p className="text-secondary-light mb-4">Ask questions in natural language and get instant visualizations</p>
              <div className="d-flex flex-wrap gap-2 justify-content-center">
                {exampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    className="btn btn-outline-primary-600 btn-sm"
                    onClick={() => setQuestion(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            conversations.map((conv) => (
              <div key={conv.id}>
                {/* User Question */}
                <div className="chat-single-message right">
                  <div className="chat-message-content">
                    <p className="mb-2">{conv.question}</p>
                    <p className="chat-time mb-0">
                      <span>{conv.timestamp}</span>
                    </p>
                  </div>
                </div>

                {/* AI Response */}
                <div className="chat-single-message left">
                  <Icon icon="mdi:robot-outline" className="text-primary-600" style={{ fontSize: '32px', marginTop: '8px' }} />
                  <div className="chat-message-content" style={{ maxWidth: '100%', width: '100%' }}>
                    {conv.loading ? (
                      <div className="d-flex align-items-center gap-2">
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Processing your question...</span>
                      </div>
                    ) : conv.error ? (
                      <div className="alert alert-danger mb-0">
                        <Icon icon="mdi:alert-circle" className="me-2" />
                        {conv.error}
                      </div>
                    ) : conv.response ? (
                      <div>
                        <div className="mb-2">
                          <small className="text-secondary-light">
                            {conv.response.result_count} record(s) found in {conv.response.execution_time_ms}ms
                          </small>
                        </div>
                        {/* Data Table */}
                        {conv.response.data && conv.response.data.length > 0 && (
                          <div className="table-responsive mt-2" style={{ maxHeight: 300, overflowY: 'auto' }}>
                            <table className="table table-sm table-striped mb-0">
                              <thead className="table-light" style={{ position: 'sticky', top: 0 }}>
                                <tr>
                                  {Object.keys(conv.response.data[0]).map(col => (
                                    <th key={col} className="text-capitalize">{col.replace(/_/g, ' ')}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {conv.response.data.map((row, i) => (
                                  <tr key={i}>
                                    {Object.values(row).map((val, j) => (
                                      <td key={j}>{val ?? '-'}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {/* Chart */}
                        {conv.response.visualization && (
                          <AIChart visualization={conv.response.visualization} />
                        )}
                        {process.env.REACT_APP_SHOW_SQL === 'true' && conv.response.optimized_sql && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm text-primary-600">View SQL</summary>
                            <pre className="bg-neutral-900 text-white p-2 rounded mt-2 mb-0" style={{ fontSize: '11px', overflowX: 'auto' }}>
                              {conv.response.optimized_sql}
                            </pre>
                          </details>
                        )}
                      </div>
                    ) : null}
                    <p className="chat-time mb-0 mt-2">
                      <span>{conv.timestamp}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <form className="chat-message-box" onSubmit={(e) => { e.preventDefault(); handleAsk(); }}>
          <input 
            type="text" 
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question... (e.g., How many pregnant women by block?)" 
            disabled={loading}
          />
          <div className="chat-message-box-action">
            <button 
              type="submit" 
              className="btn btn-sm btn-primary-600 radius-8 d-inline-flex align-items-center gap-1"
              disabled={loading || !question.trim()}
            >
              {loading ? 'Sending...' : 'Ask'}
              <Icon icon="f7:paperplane" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIReportsLayer;

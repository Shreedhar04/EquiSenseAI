import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, ChevronDown, ChevronUp, Mic, ThumbsUp, ThumbsDown } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import { cn } from './FileUpload';

// Inner component for Message Card handling its own expand/collapse state
function ChatMessageCard({ msg }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedback, setFeedback] = useState(null); // null, 'up', 'down'
  const isBot = msg.sender === 'bot';
  const textLength = msg.text.length;
  const THRESHOLD = 300;
  const isLong = isBot && textLength > THRESHOLD;

  const displayContent = isLong && !isExpanded 
    ? msg.text.slice(0, THRESHOLD) + '...'
    : msg.text;

  return (
    <div className={cn(
      "w-full max-w-[90%] flex gap-3",
      isBot ? "self-start" : "self-end flex-row-reverse"
    )}>
      {isBot && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shrink-0 shadow border border-gray-600 mt-1">
          <Bot size={16} className="text-gray-300" />
        </div>
      )}
      
      <div className="flex flex-col gap-1 max-w-[calc(100%-2.5rem)]">
        <div className={cn(
          "flex flex-col gap-2 p-4 shadow-sm relative overflow-hidden",
          isBot 
            ? "bg-gray-800 border border-gray-700 text-gray-200 rounded-2xl rounded-tl-sm" 
            : "bg-indigo-600 text-white rounded-2xl rounded-tr-sm"
        )}>
          <div className={cn(
            "prose prose-sm leading-relaxed max-w-none break-words",
            isBot ? "prose-invert" : "text-white"
          )}>
            {isBot ? (
              <ReactMarkdown
                components={{
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />
                }}
              >
                {displayContent}
              </ReactMarkdown>
            ) : (
              <span className="whitespace-pre-wrap">{msg.text}</span>
            )}
          </div>

          {isLong && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors self-start mt-1 bg-gray-700/50 px-2 py-1 rounded-md"
            >
              {isExpanded ? (
                <>Show Less <ChevronUp size={14} /></>
              ) : (
                <>Read More <ChevronDown size={14} /></>
              )}
            </button>
          )}
        </div>
        
        {isBot && (
          <div className="flex gap-2 items-center px-1 mt-1 opacity-60 hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
              className={cn("p-1 rounded hover:bg-gray-700 transition-colors", feedback === 'up' ? "text-emerald-400" : "text-gray-500")}
            >
              <ThumbsUp size={12} />
            </button>
            <button 
              onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
              className={cn("p-1 rounded hover:bg-gray-700 transition-colors", feedback === 'down' ? "text-red-400" : "text-gray-500")}
            >
              <ThumbsDown size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [avatarCenter, setAvatarCenter] = useState({ x: 0, y: 0 });
  const avatarRef = useRef(null);

  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Hi, I am here to help you with any doubts" }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-show tooltip after 1.5 seconds
  useEffect(() => {
    if (!hasInteracted) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasInteracted]);

  // Track mouse for eye/head tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    
    // Calculate avatar center
    if (avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setAvatarCenter({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    }

    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isOpen]); 

  // Calculate eye offset
  const maxOffset = 6;
  let offsetX = 0;
  let offsetY = 0;
  if (!isOpen && avatarCenter.x !== 0) {
    const dx = mousePos.x - avatarCenter.x;
    const dy = mousePos.y - avatarCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0) {
      offsetX = (dx / distance) * Math.min(maxOffset, distance / 30);
      offsetY = (dy / distance) * Math.min(maxOffset, distance / 30);
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasInteracted(true);
    setShowTooltip(false);
  };

  const handleSend = async (text) => {
    const userText = text.trim();
    if (!userText) return;

    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInputVal("");
    setIsTyping(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey === "paste_your_key_here_inside_these_quotes") {
        throw new Error("Missing API Key. Please add your Gemini API Key to the .env file and restart the server!");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: `You are the EquiSense Assistant, a highly technical AI tutor integrated into the EquiSense AI platform. Explain machine learning bias, fairness models, and metrics nicely in markdown format. 
If the user asks about Mitigation Methods (Step 4), explain the following context:
- Baseline: The raw model without any fairness interventions.
- Reweighing: Pre-processing technique that assigns different weights to training examples based on their sensitive group and class label to remove bias from the training data itself.
- Threshold Optimization: Post-processing technique (Fairlearn) that adjusts the decision boundaries (thresholds) for different sensitive groups after the model is trained to achieve demographic parity or equalized odds.
- Reweighing + Threshold Optimization: Combining both to tackle bias in data and decisions, often yielding the best fairness but sometimes at a higher cost to overall F1 Score.
Help the user decide which is best based on their priority (fairness vs pure accuracy).
If the user asks about the API or Deployment (Step 4), explain the following:
- EquiSense uses a Single API Architecture. The user generates a unique API Key (Bearer Token) to securely access the globally deployed model.
- The endpoint is typically /predict.
- To use it, they must pass their generated API Key in the 'Authorization: Bearer <API_KEY>' header along with their JSON payload.`
      });

      const chatHistory = messages.slice(1).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      const chat = model.startChat({ history: chatHistory });
      const result = await chat.sendMessage(userText);
      const responseText = result.response.text();

      setMessages(prev => [...prev, { sender: 'bot', text: responseText }]);
    } catch (error) {
      console.error(error);
      let errorMessage = `Error: ${error.message}`;
      setMessages(prev => [...prev, { sender: 'bot', text: errorMessage }]);
    } finally {
      setIsTyping(false);
    }
  };

  const QUICK_QUESTIONS = [
    "What is Demographic Parity?",
    "Explain Equal Opportunity",
    "How do ML models detect bias?"
  ];

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Prominent Tooltip */}
        {!isOpen && (
          <div className={cn(
            "mb-5 w-[280px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.2)] border border-indigo-100 relative transition-all duration-700 origin-bottom-right",
            showTooltip ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4 pointer-events-none"
          )}>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowTooltip(false); setHasInteracted(true); }}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-full transition-colors z-10"
            >
              <X size={14} />
            </button>
            <div 
              className="p-5 flex gap-4 items-start cursor-pointer hover:bg-slate-50 transition-colors rounded-2xl" 
              onClick={handleOpen}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 border border-indigo-200">
                <span className="text-2xl animate-bounce">👋</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-[15px] mb-1.5">Need help?</h4>
                <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
                  I'm your AI assistant! Click here to ask me about fairness models, metrics, or bias.
                </p>
              </div>
            </div>
            {/* Arrow pointing to avatar */}
            <div className="absolute -bottom-2 right-6 w-5 h-5 bg-white border-b border-r border-indigo-100 rotate-45"></div>
          </div>
        )}

        {/* Floating Avatar */}
        {!isOpen ? (
          <button 
            ref={avatarRef}
            onClick={handleOpen}
            className="w-16 h-16 bg-gray-900 border-2 border-indigo-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all hover:scale-110 active:scale-95 group relative overflow-visible"
          >
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/40 to-purple-500/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
            
            {/* Unread Badge Notification */}
            {!hasInteracted && showTooltip && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
                1
              </span>
            )}
            
            {/* The Head/Eye tracking container */}
            <div 
              className="relative transition-transform duration-75 ease-out z-10"
              style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}
            >
              <Bot size={32} className="text-indigo-50 drop-shadow-lg" />
            </div>
            
            {/* Idle pulse */}
            {!hasInteracted && <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full animate-ping opacity-75"></span>}
          </button>
        ) : (
          /* Chat Window - Dark Theme */
          <div className="w-[90vw] sm:w-[420px] h-[600px] max-h-[85vh] bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 origin-bottom-right">
            {/* Header */}
            <div className="bg-gray-800/90 backdrop-blur border-b border-gray-700 p-4 flex items-center justify-between text-white shrink-0 z-10">
              <div className="flex items-center gap-3">
                <div className="bg-gray-700 p-2 rounded-xl shadow-inner border border-gray-600">
                  <Bot size={20} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide text-gray-100">AI Assistant</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                    <p className="text-gray-400 text-xs font-medium">Online</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-900 flex flex-col gap-5 scroll-smooth custom-scrollbar">
              {messages.map((msg, i) => (
                <ChatMessageCard key={i} msg={msg} />
              ))}
              
              {isTyping && (
                <div className="w-full max-w-[90%] flex gap-3 self-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shrink-0 shadow border border-gray-600 mt-1">
                    <Bot size={16} className="text-gray-300" />
                  </div>
                  <div className="bg-gray-800 rounded-2xl rounded-tl-sm border border-gray-700 px-5 py-4 shadow-sm flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: "150ms"}}></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: "300ms"}}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length < 3 && !isTyping && (
              <div className="px-5 pb-4 pt-3 bg-gray-900 flex gap-2 shrink-0 overflow-x-auto custom-scrollbar border-t border-gray-800">
                {QUICK_QUESTIONS.map((q, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="whitespace-nowrap text-[13px] font-medium bg-gray-800 text-gray-300 px-4 py-2 rounded-full hover:bg-gray-700 hover:text-white transition-colors border border-gray-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(inputVal); }} 
              className="p-4 bg-gray-900 border-t border-gray-800 flex items-center gap-2 shrink-0 z-10"
            >
              <div className="flex-1 relative flex items-center">
                <input 
                  type="text" 
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  disabled={isTyping}
                  placeholder="Ask me anything..." 
                  className="w-full text-sm bg-gray-800 border border-gray-700 text-gray-100 rounded-full pl-5 pr-10 py-3.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none disabled:opacity-50 placeholder:text-gray-500"
                />
                <button type="button" className="absolute right-4 text-gray-400 hover:text-gray-200 transition-colors">
                  <Mic size={18} />
                </button>
              </div>
              <button 
                type="submit"
                disabled={!inputVal.trim() || isTyping}
                className="w-12 h-12 flex shrink-0 items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-500 active:scale-95 disabled:bg-gray-800 disabled:text-gray-500 transition-all"
              >
                <Send size={18} className="ml-px" />
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

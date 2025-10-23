const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-2 animate-loading-entry">
      <div className="typing-dot w-2 h-2 bg-enterprise-gray rounded-full"></div>
      <div className="typing-dot w-2 h-2 bg-enterprise-gray rounded-full"></div>
      <div className="typing-dot w-2 h-2 bg-enterprise-gray rounded-full"></div>
    </div>
  );
};

export default TypingIndicator;

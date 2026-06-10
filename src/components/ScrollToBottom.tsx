import GlassButton from './GlassButton.tsx';

export default function SettingsScreen() {
  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth', // Smooth scrolling animation
    });
  };

  return (
    <div className="relative pb6">
      <GlassButton compact onClick={scrollToBottom} className="stb-button" title="Scroll to bottom">
        ↓
      </GlassButton>
    </div>
  );
}
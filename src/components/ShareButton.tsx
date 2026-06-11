import GlassButton from './GlassButton.tsx';

interface ShareButtonProps {
  code: string;
}

export default function ShareButton({ code }: ShareButtonProps) {
  const canShare = typeof navigator.share === 'function';

  const handleShare = async () => {
    const shareData = {
      title: 'Join my Pickle Room',
      text: `Use this link to join my Pickle room and help us choose something to watch.`,
      url: `${window.location.origin}/${code}`,
    };

    try {
      if (canShare) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Room link copied to clipboard!');
      }
    } catch (error) {
      console.error('Could not share', error);
      // As a fallback, copy the link to the clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        alert('Sharing failed. Room link copied to clipboard as a fallback.');
      } catch (copyError) {
        console.error('Could not copy to clipboard', copyError);
        alert('Sharing and copying to clipboard failed. Please copy the link manually.');
      }
    }
  };

  return (
    <GlassButton compact onClick={handleShare}>
      {canShare ? 'Share Room' : 'Copy Link'}
    </GlassButton>
  );
}

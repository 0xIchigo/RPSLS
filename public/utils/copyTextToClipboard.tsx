const copyTextToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text);
    alert(`Copied the text: ${text}`);
}

export default copyTextToClipboard;
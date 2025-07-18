
export const fetchPageSpeedReport = async (url: string) => {
    try {
        const response = await fetch('/api/pagespeed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pageUrl: url }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch PageSpeed report from the server.');
        }

        return response.json();
    } catch (error) {
        console.error("Error fetching PageSpeed report:", error);
        throw error;
    }
};

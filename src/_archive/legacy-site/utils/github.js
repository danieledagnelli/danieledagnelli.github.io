/**
 * Fetch the last commit date from GitHub API with timeout
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} timeoutMs - Request timeout in milliseconds
 * @returns {Promise<string>} Unix timestamp string
 */
export async function getLastCommitTimestamp(owner = 'danieledagnelli', repo = 'danieledagnelli.github.io', timeoutMs = 5000) {
    try {
        // Create an AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'danieledagnelli.github.io'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.warn(`GitHub API request failed: ${response.status}`);
            return getFallbackTimestamp();
        }
        
        const commits = await response.json();
        
        if (commits && commits.length > 0) {
            const lastCommitDate = new Date(commits[0].commit.committer.date);
            return Math.floor(lastCommitDate.getTime() / 1000).toString();
        }
        
        return getFallbackTimestamp();
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('GitHub API request timed out');
        } else {
            console.warn('Error fetching last commit date:', error.message);
        }
        return getFallbackTimestamp();
    }
}

/**
 * Get fallback timestamp (current time)
 */
function getFallbackTimestamp() {
    return Math.floor(Date.now() / 1000).toString();
}

/**
 * Get cached last commit timestamp with fallback
 * This function can be used to cache the result during build
 */
let cachedTimestamp = null;

export async function getCachedLastCommitTimestamp() {
    if (!cachedTimestamp) {
        cachedTimestamp = await getLastCommitTimestamp();
    }
    return cachedTimestamp;
}

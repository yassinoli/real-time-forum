export const request = async (url, options = {}) => {
    try {
        const response = await fetch(url, options)

        const data = await response.json()

        if (!response.ok || data.code !== 200) {
            return {
                success: false,
                error: data.error || data.message,
                code: data.code
            }
        }

        return {
            success: true,
            data: data,
            code: data.code
        }

    } catch (error) {
        console.error('API Error:', error)
        return {
            success: false,
            error: 'Sorry something wrong happened. Please try again.',
            code: 500
        }
    }
}
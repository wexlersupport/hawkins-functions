import axios from 'axios'

export default async function generateScopeOfWork(filterObj) {
    const openrouterApiKey = process.env.NUXT_PUBLIC_OPENROUTER_API_KEY
    try {
        const { data } = await axios.post('https://openrouter.ai/api/v1/chat/completions',
        {
            model: "mistralai/mistral-7b-instruct",
            messages: [
                {
                    role: "user",
                    content: `With limit of 200 characters, Please give me a simple scope of work completed with objective and materials based on this '${filterObj?.scope_of_works}'`
                }
            ]
        },
        {
            headers: {
                Authorization: `Bearer ${openrouterApiKey}`,
                'Content-Type': 'application/json',
            }
        })

        return {
            response : data
        }   
    } catch (error) {
        return {
            error : error.response.data
        }
    }
}
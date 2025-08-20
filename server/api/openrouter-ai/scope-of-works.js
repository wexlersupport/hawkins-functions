import axios from 'axios'

export default async function generateScopeOfWork(filterObj) {

    try {
        const { data } = await axios.post('https://openrouter.ai/api/v1/chat/completions',
        {
            model: "mistralai/mistral-7b-instruct",
            messages: [
                {
                    role: "user",
                    content: `With limit of 200 characters, Please give me a simple scope of work completed with objective and materials based on this '${filterObj.scope_of_works}'`
                }
            ]
        },
        {
            headers: {
                Authorization: 'Bearer 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',
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
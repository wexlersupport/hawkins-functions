import axios from 'axios'

export default async function fetchCustomerId(id, group) {
    const vistaApiUrl = process.env.NUXT_PUBLIC_VISTA_API_URL
    const vistaApiKey = process.env.NUXT_PUBLIC_VISTA_API_KEY
    const vistaSubscriptionCode = process.env.NUXT_PUBLIC_VISTA_SUBSCRIPTION_CODE

    try {
        const url = vistaApiUrl+vistaSubscriptionCode+'/vista/ar/2/data/customers/cache/natural/'+group+'/'+id
        const { data } = await axios.get(url, {
            headers: {
                Accept: 'application/json',
                'X-Application-Key': vistaApiKey
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
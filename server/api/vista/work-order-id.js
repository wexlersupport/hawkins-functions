import axios from 'axios'

export default async function fetchWorkOrderId(id) {
    const vistaApiUrl = process.env.NUXT_PUBLIC_VISTA_API_URL
    const vistaApiKey = process.env.NUXT_PUBLIC_VISTA_API_KEY
    const vistaSubscriptionCode = process.env.NUXT_PUBLIC_VISTA_SUBSCRIPTION_CODE

    try {
        const { data } = await axios.get(vistaApiUrl+vistaSubscriptionCode+'/vista/sm/2/data/work_orders/cache/natural/1/'+id, {
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
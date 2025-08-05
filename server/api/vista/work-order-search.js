import axios from 'axios'

export default async function fetchWorkOrder(filterObj) {
    const vistaApiUrl = process.env.NUXT_PUBLIC_VISTA_API_URL
    const vistaApiKey = process.env.NUXT_PUBLIC_VISTA_API_KEY
    const vistaSubscriptionCode = process.env.NUXT_PUBLIC_VISTA_SUBSCRIPTION_CODE

    try {
        const { data } = await axios.post(vistaApiUrl+vistaSubscriptionCode+'/vista/sm/2/data/work_orders/cache/search',
        {
            filters: [filterObj],
        },
        {
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
import axios from 'axios'

export default async function getAttachmentList(cookie, uniqueAttchID) {
    const vistaApiKey = process.env.NUXT_PUBLIC_VISTA_API_KEY

    try {
        const url = 'https://hawkinselectricserviceinc-hff.viewpointforcloud.com/Document/GetVPAttachmentList?uniqueAttchID='+uniqueAttchID
        const { data } = await axios.get(url, {
            headers: {
                Accept: 'application/json',
                'X-Application-Key': vistaApiKey,
                Cookie: cookie || ''
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
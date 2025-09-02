import axios from 'axios'

export default async function getAttachmentById(cookie, attachmentID) {
    const vistaApiKey = process.env.NUXT_PUBLIC_VISTA_API_KEY

    try {
        const url = 'https://hawkinselectricserviceinc-hff.viewpointforcloud.com/Document/GetVPAttachment?attachmentID=' + attachmentID
        const response = await axios.get(url, {
            responseType: "arraybuffer", // 👈 ensures PDF binary data
            headers: {
                Accept: "application/json",
                "X-Application-Key": vistaApiKey,
                Cookie: cookie || "",
            },
        });

        return Buffer.from(response.data);
    } catch (error) {
        console.error("Status:", error.response?.status);
        console.error("Headers:", error.response?.headers);
        console.error("Data:", error.response?.data?.toString());

        return {
            error : error.response?.data || error.message,
        }
    }
}
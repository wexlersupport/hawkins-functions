import axios from 'axios'

export default async function Login(employee_no, password) {

    try {
        const url = 'https://hawkinselectricserviceinc-hff.viewpointforcloud.com/Account/Login'
        const response = await axios.post(url,
            {
                Employee: employee_no,
                Password: password,
                PRCo: 1,
                PMMode: false
            },
            { withCredentials: true }
        )

        const cookies = response.headers['set-cookie']

        return {
            response : response.data,
            cookies
        }
    } catch (error) {
        return {
            error : error.response.data
        }
    }
}
import sgMail from '@sendgrid/mail'
import nodemailer from "nodemailer";

const sendgridApiKey = process.env.NUXT_PUBLIC_SENDGRID_API_KEY
sgMail.setApiKey(sendgridApiKey)

export default async function sendEmail({ from, to, subject, html, filename, content }) {
    try {
        const sendContent = { from, to, subject, html }
        if (sendContent.html) {
            sendContent.html = convertHtmlEmail(html)
        }
        const attachments = [
            {
                content,
                filename,
                type: "text/html",
                encoding: "base64",
                disposition: "attachment"
            }
        ]
        sendContent.attachments = attachments

        // console.log('sendContent ', sendContent)
        // const data = sgMail
        //     .send(sendContent)
        //     .then((res) => {
        //         console.log('Email sent')
        //         return res
        //     })
        //     .catch((error) => {
        //         console.error(error)
        //         return error
        //     })

        const transporter = nodemailer.createTransport({
            service: "gmail", // you can also use "Outlook365", "Yahoo", or custom SMTP
            auth: {
                user: from, // your email
                pass: 'mizh igci lyma mtpx', // app password (not your real password!)
            },
        });

        const data = await transporter.sendMail(sendContent);

        return data;
    } catch (error) {
        return error;
    }
}

export function convertHtmlEmail(body) {
  return `<html>
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              </head>
              <body>
                <div>
                  ${body}
                </div>
              </body>
            </html>`;
}
// DCA Auto-buy — interactive Framer code component
// Hold "Hold to confirm" → the sheet expands, the four values fly into pills,
// the sentence reads in, then "Finish setup" wipes blue and loops back.
//
// Self-contained: no external libraries, no CDN. The phone is laid out at its
// design size (402 x 874) and scaled to fit whatever frame you give it.

import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"

const STATUS_SVG = `<svg width="362" height="44" viewBox="0 0 362 44" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M272.626 29.4397C272.626 30.4413 271.815 31.2532 270.813 31.2532C269.811 31.2532 269 30.4413 269 29.4397V26.4465C269 25.445 269.811 24.6331 270.813 24.6331C271.815 24.6331 272.626 25.445 272.626 26.4465V29.4397ZM278.066 29.4397C278.066 30.4413 277.254 31.2532 276.252 31.2532C275.251 31.2532 274.439 30.4413 274.439 29.4397V24.4485C274.439 23.4469 275.251 22.635 276.252 22.635C277.254 22.635 278.066 23.4469 278.066 24.4485V29.4397ZM283.508 29.4397C283.508 30.4413 282.696 31.2532 281.695 31.2532C280.693 31.2532 279.881 30.4413 279.881 29.4397V22.1125C279.881 21.111 280.693 20.2991 281.695 20.2991C282.696 20.2991 283.508 21.111 283.508 22.1125V29.4397ZM288.949 29.4387C288.949 30.4403 288.137 31.2522 287.135 31.2522C286.134 31.2522 285.322 30.4403 285.322 29.4387V19.8225C285.322 18.821 286.134 18.009 287.135 18.009C288.137 18.009 288.949 18.821 288.949 19.8225V29.4387Z" fill="currentColor"/> <path d="M347.701 23.0473C347.701 22.9333 347.797 22.8415 347.91 22.8563C349.121 23.0147 350.056 24.0478 350.056 25.3018C350.055 26.5556 349.12 27.5879 347.91 27.7463C347.797 27.7611 347.701 27.6693 347.701 27.5553V23.0473Z" fill="currentColor" fill-opacity="0.3"/> <rect x="321.007" y="18.5586" width="26.1698" height="13.3798" rx="4.5" fill="currentColor"/> <path d="M304.917 27.6641C305.79 27.6651 307.1 28.262 307.704 28.8028C307.955 29.0276 307.873 29.3734 307.633 29.6163L305.677 31.5909C305.264 32.0077 304.564 32.0148 304.158 31.6065L302.164 29.6026C301.93 29.3676 301.858 29.0306 302.115 28.8087C302.729 28.2788 304.05 27.6633 304.917 27.6641ZM305.161 23.0342C307.199 23.0814 309 23.84 310.584 25.0186C311.049 25.3645 311.068 26.0399 310.657 26.4483L310.053 27.0479C309.68 27.4183 309.089 27.4294 308.654 27.1339C307.622 26.4316 306.481 26.0644 305.092 26.0323C303.633 25.9987 302.402 26.4528 301.137 27.2354C300.718 27.4941 300.172 27.445 299.831 27.0909L299.129 26.3624C298.751 25.9699 298.754 25.3414 299.182 25.004C300.883 23.6626 303.074 22.9862 305.161 23.0342ZM305.166 18.003C305.911 18.0202 307.13 18.0575 307.977 18.3174C308.825 18.5775 309.355 18.7563 310.684 19.3311C311.704 19.7719 313.04 20.7661 314.031 21.5772C314.469 21.936 314.5 22.5889 314.111 23.001L313.534 23.6133C313.165 24.005 312.543 24.0446 312.101 23.7374C311.18 23.0963 309.757 22.2121 308.829 21.8106C307.555 21.2596 307.134 21.2507 306.379 21.1124C305.624 20.9741 305.13 21.0086 304.843 21.002C304.555 20.9954 303.96 20.9863 303.135 21.1124C302.309 21.2384 302.078 21.2472 300.745 21.8106C299.756 22.2289 298.464 23.1683 297.552 23.8428C297.116 24.1647 296.51 24.0704 296.187 23.6358L295.672 22.9405C295.336 22.4881 295.437 21.8431 295.883 21.4991C296.853 20.7509 298.077 19.7838 299.147 19.3311C300.553 18.7369 301.088 18.5587 301.96 18.2979C302.831 18.0372 304.42 17.9858 305.166 18.003Z" fill="currentColor"/> <path d="M31.0401 31.2354C30.046 31.2354 29.1928 30.9839 28.4804 30.4808C27.7721 29.9737 27.2268 29.2433 26.8444 28.2894C26.4661 27.3316 26.2769 26.1785 26.2769 24.8303C26.281 23.482 26.4721 22.335 26.8505 21.3892C27.2328 20.4394 27.7781 19.715 28.4865 19.2159C29.1988 18.7169 30.05 18.4673 31.0401 18.4673C32.0301 18.4673 32.8814 18.7169 33.5937 19.2159C34.3061 19.715 34.8514 20.4394 35.2297 21.3892C35.6121 22.339 35.8032 23.486 35.8032 24.8303C35.8032 26.1825 35.6121 27.3376 35.2297 28.2955C34.8514 29.2493 34.3061 29.9777 33.5937 30.4808C32.8854 30.9839 32.0342 31.2354 31.0401 31.2354ZM31.0401 29.3459C31.8128 29.3459 32.4225 28.9656 32.8693 28.2049C33.32 27.4402 33.5454 26.3153 33.5454 24.8303C33.5454 23.8482 33.4428 23.0232 33.2375 22.3551C33.0323 21.687 32.7425 21.1839 32.3682 20.8459C31.9939 20.5038 31.5512 20.3327 31.0401 20.3327C30.2714 20.3327 29.6637 20.7151 29.2169 21.4798C28.7702 22.2404 28.5448 23.3572 28.5408 24.8303C28.5368 25.8163 28.6354 26.6454 28.8366 27.3175C29.0419 27.9896 29.3316 28.4967 29.7059 28.8388C30.0802 29.1768 30.5249 29.3459 31.0401 29.3459ZM41.7613 18.4673C42.3529 18.4714 42.9284 18.576 43.4878 18.7812C44.0513 18.9825 44.5584 19.3125 45.0091 19.7713C45.4599 20.2261 45.8181 20.8358 46.0837 21.6005C46.3493 22.3652 46.4821 23.311 46.4821 24.4379C46.4862 25.5004 46.3735 26.4502 46.1441 27.2873C45.9187 28.1204 45.5947 28.8247 45.1721 29.4002C44.7495 29.9757 44.2404 30.4144 43.6448 30.7163C43.0491 31.0181 42.379 31.169 41.6345 31.169C40.8537 31.169 40.1615 31.0161 39.5578 30.7102C38.9581 30.4044 38.4731 29.9858 38.1029 29.4545C37.7326 28.9233 37.5052 28.3156 37.4207 27.6314H39.6242C39.7369 28.1224 39.9663 28.5128 40.3124 28.8026C40.6625 29.0883 41.1032 29.2312 41.6345 29.2312C42.4917 29.2312 43.1518 28.8589 43.6146 28.1143C44.0774 27.3698 44.3088 26.3355 44.3088 25.0114H44.2243C44.0271 25.3655 43.7716 25.6714 43.4576 25.929C43.1437 26.1825 42.7875 26.3777 42.3891 26.5146C41.9947 26.6514 41.5761 26.7198 41.1334 26.7198C40.409 26.7198 39.757 26.5468 39.1774 26.2006C38.6019 25.8545 38.1451 25.3796 37.8071 24.7759C37.473 24.1722 37.304 23.482 37.3 22.7053C37.3 21.9003 37.4851 21.1779 37.8554 20.538C38.2296 19.8941 38.7508 19.387 39.4189 19.0167C40.087 18.6424 40.8678 18.4593 41.7613 18.4673ZM41.7673 20.2784C41.3326 20.2784 40.9402 20.3851 40.5901 20.5984C40.244 20.8076 39.9703 21.0934 39.7691 21.4556C39.5719 21.8138 39.4733 22.2143 39.4733 22.657C39.4773 23.0956 39.5759 23.4941 39.7691 23.8523C39.9663 24.2105 40.2339 24.4942 40.572 24.7035C40.9141 24.9128 41.3045 25.0174 41.7431 25.0174C42.0691 25.0174 42.373 24.955 42.6547 24.8303C42.9364 24.7055 43.1819 24.5324 43.3912 24.3111C43.6045 24.0857 43.7695 23.8301 43.8863 23.5444C44.007 23.2586 44.0653 22.9568 44.0613 22.6388C44.0613 22.2163 43.9607 21.8259 43.7595 21.4677C43.5623 21.1095 43.2906 20.8217 42.9445 20.6044C42.6024 20.3871 42.21 20.2784 41.7673 20.2784ZM49.5228 29.5149C49.1566 29.5149 48.8427 29.3861 48.5811 29.1286C48.3195 28.867 48.1907 28.553 48.1947 28.1868C48.1907 27.8246 48.3195 27.5147 48.5811 27.2571C48.8427 26.9995 49.1566 26.8707 49.5228 26.8707C49.877 26.8707 50.1849 26.9995 50.4465 27.2571C50.7121 27.5147 50.8469 27.8246 50.8509 28.1868C50.8469 28.4323 50.7825 28.6557 50.6578 28.8569C50.537 29.0581 50.376 29.2191 50.1748 29.3398C49.9776 29.4566 49.7603 29.5149 49.5228 29.5149ZM49.5228 23.3874C49.1566 23.3874 48.8427 23.2586 48.5811 23.0011C48.3195 22.7395 48.1907 22.4255 48.1947 22.0593C48.1907 21.6971 48.3195 21.3872 48.5811 21.1296C48.8427 20.868 49.1566 20.7372 49.5228 20.7372C49.877 20.7372 50.1849 20.868 50.4465 21.1296C50.7121 21.3872 50.8469 21.6971 50.8509 22.0593C50.8469 22.3008 50.7825 22.5221 50.6578 22.7234C50.537 22.9246 50.376 23.0856 50.1748 23.2063C49.9776 23.3271 49.7603 23.3874 49.5228 23.3874ZM52.5197 28.706V26.9251L57.7658 18.6364H59.2509V21.1719H58.3454L54.8138 26.7681V26.8647H62.1366V28.706H52.5197ZM58.4178 31V28.1626L58.442 27.3658V18.6364H60.5549V31H58.4178ZM68.5881 18.6364V31H66.3484V20.8157H66.276L63.3843 22.663V20.6104L66.4571 18.6364H68.5881Z" fill="currentColor"/> </svg>`
const DIGITS_SVG = `<svg width="50" height="9" viewBox="0 0 50 9" fill="none" xmlns="http://www.w3.org/2000/svg"> <circle cx="1.5" cy="4.66016" r="1.5" fill="#252525"/> <circle cx="11.5" cy="4.66016" r="1.5" fill="#252525"/> <circle cx="6.5" cy="4.66016" r="1.5" fill="#252525"/> <circle cx="16.5" cy="4.66016" r="1.5" fill="#252525"/> <path d="M23.9082 8.66016V7.76367L26.7207 4.82227C27.0957 4.43164 27.3867 4.11133 27.5938 3.86133C27.8008 3.60742 27.9453 3.38086 28.0273 3.18164C28.1133 2.98242 28.1562 2.76758 28.1562 2.53711V2.52539C28.1562 2.24805 28.0957 2.00195 27.9746 1.78711C27.8574 1.56836 27.6875 1.39844 27.4648 1.27734C27.2422 1.15234 26.9766 1.08984 26.668 1.08984C26.3555 1.08984 26.0801 1.1543 25.8418 1.2832C25.6035 1.41211 25.418 1.5918 25.2852 1.82227C25.1523 2.05273 25.0859 2.32227 25.0859 2.63086V2.6543L23.8438 2.64844L23.8379 2.63672C23.8418 2.12109 23.9668 1.66602 24.2129 1.27148C24.459 0.873047 24.8008 0.5625 25.2383 0.339844C25.6758 0.113281 26.1777 0 26.7441 0C27.2676 0 27.7344 0.103516 28.1445 0.310547C28.5586 0.513672 28.8848 0.796875 29.123 1.16016C29.3613 1.51953 29.4805 1.93164 29.4805 2.39648V2.41406C29.4805 2.73438 29.4219 3.04492 29.3047 3.3457C29.1875 3.64648 28.9844 3.97656 28.6953 4.33594C28.4102 4.69531 28.0117 5.12891 27.5 5.63672L25.3672 7.76367L25.707 7.17188V7.76367L25.373 7.53516H29.6152V8.66016H23.9082ZM33.7817 8.86523C33.2309 8.86523 32.7427 8.75977 32.3169 8.54883C31.8911 8.33789 31.5512 8.05078 31.2973 7.6875C31.0434 7.32031 30.895 6.91016 30.852 6.45703L30.8462 6.38086H32.0825L32.0884 6.42773C32.1274 6.67383 32.2212 6.89844 32.3696 7.10156C32.522 7.30469 32.7212 7.46484 32.9673 7.58203C33.2134 7.69922 33.4887 7.75781 33.7934 7.75781C34.1411 7.75781 34.4477 7.68164 34.7134 7.5293C34.979 7.37305 35.186 7.16016 35.3345 6.89062C35.4868 6.62109 35.563 6.31055 35.563 5.95898V5.94727C35.563 5.59961 35.4868 5.29102 35.3345 5.02148C35.1821 4.75195 34.9751 4.54297 34.7134 4.39453C34.4516 4.24219 34.1489 4.16602 33.8052 4.16602C33.5512 4.16602 33.3149 4.20508 33.0962 4.2832C32.8813 4.35742 32.6899 4.4707 32.522 4.62305C32.4477 4.69336 32.3774 4.76953 32.311 4.85156C32.2446 4.92969 32.186 5.01758 32.1352 5.11523H30.9985L31.4204 0.205078H36.3423V1.31836H32.4575L32.1997 4.01367H32.2934C32.4145 3.82227 32.5649 3.66016 32.7446 3.52734C32.9282 3.39453 33.1352 3.29297 33.3657 3.22266C33.5962 3.15234 33.8403 3.11719 34.0981 3.11719C34.6294 3.11719 35.0981 3.23828 35.5044 3.48047C35.9145 3.72266 36.2368 4.05469 36.4712 4.47656C36.7055 4.89844 36.8227 5.38086 36.8227 5.92383V5.93555C36.8227 6.50977 36.6919 7.01758 36.4302 7.45898C36.1723 7.90039 35.8149 8.24609 35.3579 8.49609C34.9048 8.74219 34.3794 8.86523 33.7817 8.86523ZM37.9834 8.66016V7.76367L40.7959 4.82227C41.1709 4.43164 41.4619 4.11133 41.6689 3.86133C41.8759 3.60742 42.0205 3.38086 42.1025 3.18164C42.1884 2.98242 42.2314 2.76758 42.2314 2.53711V2.52539C42.2314 2.24805 42.1709 2.00195 42.0498 1.78711C41.9326 1.56836 41.7627 1.39844 41.54 1.27734C41.3173 1.15234 41.0517 1.08984 40.7431 1.08984C40.4306 1.08984 40.1552 1.1543 39.917 1.2832C39.6787 1.41211 39.4931 1.5918 39.3603 1.82227C39.2275 2.05273 39.1611 2.32227 39.1611 2.63086V2.6543L37.9189 2.64844L37.913 2.63672C37.917 2.12109 38.042 1.66602 38.288 1.27148C38.5341 0.873047 38.8759 0.5625 39.3134 0.339844C39.7509 0.113281 40.2529 0 40.8193 0C41.3427 0 41.8095 0.103516 42.2197 0.310547C42.6337 0.513672 42.9599 0.796875 43.1982 1.16016C43.4365 1.51953 43.5556 1.93164 43.5556 2.39648V2.41406C43.5556 2.73438 43.497 3.04492 43.3798 3.3457C43.2627 3.64648 43.0595 3.97656 42.7705 4.33594C42.4853 4.69531 42.0869 5.12891 41.5752 5.63672L39.4423 7.76367L39.7822 7.17188V7.76367L39.4482 7.53516H43.6904V8.66016H37.9834ZM46.9897 8.66016V1.55859H46.8959L44.769 3.07617V1.78711L46.9955 0.205078H48.308V8.66016H46.9897Z" fill="black"/> </svg>`
const CARD_SVG = `<svg width="38" height="23" viewBox="0 0 38 23" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M2 0.150391H36C37.0217 0.150391 37.8496 0.978273 37.8496 2V6.92773C36.634 7.8695 35.8496 9.34268 35.8496 11C35.8496 12.6569 36.6345 14.1286 37.8496 15.0703V21C37.8496 22.0217 37.0217 22.8496 36 22.8496H2C0.978273 22.8496 0.150391 22.0217 0.150391 21V2C0.150391 0.978273 0.978273 0.150391 2 0.150391Z" fill="white" stroke="#E6E6E6" stroke-width="0.3"/> <mask id="visa_mask0" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="38" height="23"> <path d="M36 0C37.1046 0 38 0.895431 38 2V7C36.7857 7.91221 36 9.36426 36 11C36 12.6355 36.7859 14.0868 38 14.999V21C38 22.1046 37.1046 23 36 23H2C0.895431 23 2.01333e-08 22.1046 0 21V2C0 0.895431 0.895431 8.05319e-09 2 0H36Z" fill="#D9D9D9"/> </mask> <g mask="url(#visa_mask0)"> <g filter="url(#visa_filter0)"> <circle cx="7.24567" cy="7.38361" r="9.48761" fill="#BEB3B3" fill-opacity="0.75"/> </g> <g filter="url(#visa_filter1)"> <circle cx="36.1859" cy="-5.95514" r="9.48761" fill="#C2C2C2"/> </g> <g filter="url(#visa_filter2)"> <circle cx="36.1859" cy="31.4874" r="9.48761" fill="#C2C2C2"/> </g> </g> <path d="M25.0564 12.8844C25.5685 12.8844 26.1457 12.8504 26.2166 12.9088V12.9098C26.7051 12.9466 26.923 12.9929 27.3933 13.1451C27.3697 13.3758 27.3085 13.6558 27.2625 13.8854C27.2171 14.1115 27.1789 14.4192 27.1199 14.6364C26.9241 14.5927 26.7483 14.4938 26.572 14.4489C26.208 14.3725 25.3797 14.25 25.0251 14.3961C24.0343 14.8045 24.6947 15.4016 25.2537 15.6725C25.9161 16.0381 26.7976 16.4566 27.0154 17.2545C27.3649 18.5358 26.4563 19.6982 25.2683 20.0455C24.3837 20.304 22.6545 20.27 21.8513 19.8405C21.9115 19.5157 21.9699 19.1903 22.0261 18.8649C22.0457 18.7559 22.1045 18.2692 22.2664 18.3424C22.5228 18.4585 22.7654 18.5406 23.0408 18.6002C23.4364 18.6706 24.3623 18.7155 24.7283 18.5905C24.8984 18.5104 25.0658 18.3716 25.1248 18.191C25.3049 17.6142 24.4682 17.2859 24.0847 17.0748C23.4057 16.701 22.6398 16.2237 22.5955 15.358C22.5206 13.8936 23.6491 13.1413 24.9275 12.9196L24.9333 12.9186C25.0062 12.9047 25.018 12.9204 25.0564 12.8844ZM19.4412 12.9811C19.3602 13.2002 19.2522 13.4377 19.1609 13.6549L18.5437 15.1031C18.4222 15.3893 18.3163 15.702 18.196 15.9928L17.2146 18.3297C17.0329 18.7688 16.8228 19.1899 16.6609 19.6364C16.6062 19.7872 16.5278 19.9296 16.4841 20.0865C16.4762 20.1053 16.4572 20.121 16.4421 20.1344C16.3271 20.2354 14.8254 20.1803 14.5496 20.1686C14.5079 20.1318 14.4803 20.1197 14.4695 20.0729C14.4041 19.4947 14.1867 18.8732 14.0701 18.2975C14.0351 18.1247 13.9411 17.921 13.8962 17.7408L13.3328 15.5416C13.2236 15.1025 13.1012 14.5745 12.9617 14.1324C12.8221 13.6922 11.6931 13.431 11.2908 13.2633C11.1776 13.2161 10.9561 13.1952 10.8289 13.1471C10.8276 13.0957 10.8252 13.0346 10.8269 12.984L13.1541 12.9781C13.4577 12.9784 13.8788 12.9598 14.1658 12.9996C14.4192 13.0349 14.7457 13.3086 14.7781 13.5621C14.9002 14.0977 14.9838 14.6247 15.0681 15.1656C15.1399 15.6049 15.2705 16.0356 15.3435 16.4752C15.4033 16.7909 15.5126 17.5386 15.6287 17.7965C15.6907 17.5553 15.823 17.2942 15.9167 17.0533L16.5544 15.4244L17.2 13.7906C17.3028 13.5275 17.3987 13.2332 17.5144 12.984C17.8859 12.9677 18.295 12.9744 18.6677 12.9752C18.8938 12.9757 19.2212 12.9654 19.4412 12.9811ZM32.2019 13.3795C32.2464 13.6135 32.3213 13.8433 32.3689 14.0758L32.988 17.024C33.0523 17.3238 33.0909 17.6328 33.1541 17.9332C33.265 18.462 33.3538 18.9927 33.5007 19.5133C33.5474 19.6787 33.5642 19.8686 33.6082 20.0358C33.612 20.0468 33.6139 20.0563 33.614 20.068C33.6143 20.0973 33.6069 20.1222 33.5847 20.1422C33.5007 20.2171 32.2161 20.1855 32.0271 20.1647C31.9741 20.1588 31.9078 20.1431 31.8728 20.0992C31.8489 19.7576 31.7597 19.4155 31.7205 19.0631C31.4762 19.005 30.8857 19.0234 30.5984 19.024C30.1757 19.0212 29.7526 19.0235 29.3298 19.0309C29.1538 19.2967 29.0802 19.8234 28.9255 20.1031C28.5144 20.2443 27.9181 20.1709 27.4783 20.1774C27.3278 20.1796 27.1745 20.1344 27.0261 20.1012L27.0164 20.0836L27.0339 20.0699L28.8298 15.7496L29.4871 14.1647C29.6501 13.7728 29.777 13.2123 30.2087 13.0377C30.2762 13.0105 30.3473 12.9933 30.4197 12.986C30.5868 12.9682 30.8638 12.9759 31.0378 12.9762C31.4026 12.9792 31.7678 12.9766 32.1326 12.9694C32.1541 13.1068 32.1761 13.2429 32.2019 13.3795ZM22.0505 12.9694C21.8836 14.0026 21.6595 15.0355 21.405 16.0504C21.362 16.2221 21.3561 16.4085 21.3181 16.5787C21.2331 16.9596 21.1651 17.3435 21.0876 17.7252L20.5886 20.0748C20.59 20.0975 20.5925 20.0863 20.5769 20.108C20.4661 20.1253 20.4507 20.1515 20.3406 20.1627C20.0029 20.1971 19.6504 20.1854 19.3103 20.1871C19.1764 20.1878 18.8992 20.1947 18.7849 20.1793C18.7712 20.138 18.7588 20.0659 18.7712 20.024C18.8233 19.7125 18.8639 19.3803 18.9441 19.0758C19.0216 18.7814 19.0663 18.4941 19.1277 18.1989C19.192 17.8897 19.256 17.6483 19.282 17.3297C19.2811 17.2551 19.4022 16.8968 19.4392 16.8512C19.4459 16.8731 19.4517 16.8953 19.4568 16.9176C19.5067 16.9243 19.4246 16.862 19.4392 16.8229C19.4654 16.5262 19.5637 16.2299 19.6228 15.9401L20.0642 13.7946C20.1145 13.5591 20.2264 13.1961 20.2439 12.9694C20.8236 12.9853 21.4676 12.9784 22.0505 12.9694ZM30.741 14.9547C30.6875 15.3397 30.5568 15.5977 30.4216 15.9537C30.3081 16.2531 30.2106 16.5705 30.1091 16.8746C30.0359 17.0937 29.9239 17.3474 29.8699 17.568C29.9903 17.5924 30.2074 17.5781 30.3386 17.5797C30.6785 17.5839 31.0306 17.5677 31.3699 17.5768C31.2959 17.1321 31.2052 16.6817 31.1228 16.2379C31.0723 15.9666 30.9857 15.679 30.9363 15.4059C30.901 15.162 30.9084 15.1386 30.741 14.9547ZM26.2166 12.9098H26.2156H26.2166Z" fill="#575757"/> <defs> <filter id="visa_filter0" x="-22.1419" y="-22.004" width="58.7753" height="58.7752" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"> <feFlood flood-opacity="0" result="BackgroundImageFix"/> <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/> <feGaussianBlur stdDeviation="9.95" result="visa_blur"/> </filter> <filter id="visa_filter1" x="6.79824" y="-35.3427" width="58.7751" height="58.7752" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"> <feFlood flood-opacity="0" result="BackgroundImageFix"/> <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/> <feGaussianBlur stdDeviation="9.95" result="visa_blur"/> </filter> <filter id="visa_filter2" x="6.79824" y="2.09976" width="58.7751" height="58.7752" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"> <feFlood flood-opacity="0" result="BackgroundImageFix"/> <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/> <feGaussianBlur stdDeviation="9.95" result="visa_blur"/> </filter> </defs> </svg>`

const W = 402
const H = 874

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 864
 * @framerIntrinsicHeight 1080
 */
export default function DCAFlow(props: Props) {
    const rootRef = useRef<HTMLDivElement>(null)
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const root = rootRef.current
        if (!root) return
        return mount(root, () => propsRef.current)
    }, [])
    // flipping "Sheet only" just re-places the phone (restarting would lose the wash's
    // WebGL context, which the previous run released)
    useEffect(() => {
        ;(rootRef.current as any)?.__dcaPlace?.()
    }, [props.sheetOnly, props.sheetZoom])

    return (
        <div
            ref={rootRef}
            className={"dca" + (props.sheetOnly ? " dca--sheet" : "")}
            style={{
                ...props.style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: props.background,
                ["--dca-font" as any]: props.fontFamily == null ? undefined : `${props.fontFamily}`,
                ["--dca-title-size" as any]: props.titleSize == null ? undefined : `${props.titleSize}px`,
                ["--dca-label-size" as any]: props.labelSize == null ? undefined : `${props.labelSize}px`,
                ["--dca-value-size" as any]: props.valueSize == null ? undefined : `${props.valueSize}px`,
                ["--dca-value-track" as any]: props.valueTrack == null ? undefined : `${props.valueTrack}px`,
                ["--dca-value-weight" as any]: props.valueWeight == null ? undefined : `${props.valueWeight}`,
                ["--dca-disclaimer-size" as any]: props.disclaimerSize == null ? undefined : `${props.disclaimerSize}px`,
                ["--dca-button-size" as any]: props.buttonSize == null ? undefined : `${props.buttonSize}px`,
                ["--dca-button-radius" as any]: props.buttonRadius == null ? undefined : `${props.buttonRadius}px`,
                ["--dca-sentence-size" as any]: props.sentenceSize == null ? undefined : `${props.sentenceSize}px`,
                ["--dca-sentence-track" as any]: props.sentenceTrack == null ? undefined : `${props.sentenceTrack}px`,
                ["--dca-top-shadow" as any]: props.topShadow == null ? undefined : `${props.topShadow}`,
                ["--dca-top-shadow-blur" as any]: props.topShadowBlur == null ? undefined : `${props.topShadowBlur}px`,
                ["--dca-back-shade" as any]: props.backSheetShade == null ? undefined : `${props.backSheetShade}%`,
                ["--dca-finish-size" as any]: props.finishSize == null ? undefined : `${props.finishSize}px`,
                ["--dca-footnote-size" as any]: props.footnoteSize == null ? undefined : `${props.footnoteSize}px`,
                ["--dca-accent" as any]: props.accent == null ? undefined : `${props.accent}`,
                ["--dca-ink" as any]: props.ink == null ? undefined : `${props.ink}`,
                ["--dca-label" as any]: props.labelColor == null ? undefined : `${props.labelColor}`,
                ["--dca-sheet" as any]: props.sheetColor == null ? undefined : `${props.sheetColor}`,
                ["--dca-back-sheet" as any]: props.backSheetColor == null ? undefined : `${props.backSheetColor}`,
                ["--dca-back-btn" as any]: props.backButton == null ? undefined : `${props.backButton}`,

            }}
        >
            <style>{CSS}</style>
            <div className="dca-fit">
                <div className={"screen" + (props.hairline ? " screen--line" : "")}>
                    <div
                        className="status-bar"
                        dangerouslySetInnerHTML={{ __html: STATUS_SVG }}
                    />
                    <div className="wipe" />
                    <div className="sheet-back" />

                    <div className="sheet">
                        <div className="shader">
                            <canvas className="wash" />
                        </div>

                        <div className="sheet__handle fades-out" />

                        <div className="sheet__header fades-out">
                            <p className="sheet__title">Set up auto-buy</p>
                            <span className="sheet__step">
                                <span className="sheet__dot" />
                                <span className="sheet__dot" />
                                <span className="sheet__dot" />
                                <span className="sheet__dot sheet__dot--on" />
                            </span>
                        </div>

                        <div className="spacer" />

                        <div className="rows">
                            <div className="row">
                                <span className="row__label fades-out">Currency</span>
                                <span className="row__value" data-token="coin">
                                    <span className="tok">Bitcoin</span>
                                </span>
                            </div>
                            <div className="row">
                                <span className="row__label fades-out">Frequency</span>
                                <span className="row__value" data-token="day">
                                    <span className="drop">Every </span>
                                    <span className="tok">Monday</span>
                                </span>
                            </div>
                            <div className="row">
                                <span className="row__label fades-out">Amount</span>
                                <span className="row__value" data-token="amount">
                                    <span className="tok">$150</span>
                                </span>
                            </div>
                            <div className="row">
                                <span className="row__label fades-out">Goal</span>
                                <span className="row__value" data-token="goal">
                                    <span className="tok">0.2 BTC</span>
                                </span>
                            </div>
                            <div className="row row--payment fades-out">
                                <span className="row__label">Payment method</span>
                                <div className="payment__right">
                                    <span
                                        className="payment__digits"
                                        dangerouslySetInnerHTML={{ __html: DIGITS_SVG }}
                                    />
                                    <div
                                        className="payment__card"
                                        dangerouslySetInnerHTML={{ __html: CARD_SVG }}
                                    />
                                </div>
                            </div>
                        </div>

                        <p className="disclaimer fades-out">
                            Crypto prices can go down as well as up.
                            <br />
                            Recurring buys don't guarantee a profit or protect against loss.
                        </p>

                        <div className="actions fades-out">
                            <button className="btn btn--back" type="button">
                                Back
                            </button>
                            <button className="btn btn--confirm" type="button">
                                <span className="btn__fill" />
                                <span className="btn__label">Hold to confirm</span>
                            </button>
                        </div>

                        <div className="summary">
                            <p className="sentence">
                                <span className="line">
                                    <span className="w">Done.</span>{" "}
                                    <span className="w">Starting</span>{" "}
                                    <span className="pill" data-pill="day">
                                        <span className="pill__bg" />
                                        <span className="pill__t">Monday</span>
                                        <span className="pill__x"> 14 Sept</span>
                                    </span>
                                    <span className="w">,</span>
                                </span>
                                <span className="line">
                                    <span className="w">I</span> <span className="w">will</span>{" "}
                                    <span className="w">buy</span>{" "}
                                    <span className="pill" data-pill="amount">
                                        <span className="pill__bg" />
                                        <span className="pill__t">$150</span>
                                    </span>{" "}
                                    <span className="w">worth</span> <span className="w">of</span>
                                </span>
                                <span className="line">
                                    <span className="pill" data-pill="coin">
                                        <span className="pill__bg" />
                                        <span className="pill__t">Bitcoin</span>
                                    </span>{" "}
                                    <span className="w">every</span>{" "}
                                    <span className="w">week.</span>{" "}
                                    <span className="w">This</span> <span className="w">will</span>
                                </span>
                                <span className="line">
                                    <span className="w">continue</span>{" "}
                                    <span className="w">until</span> <span className="w">the</span>{" "}
                                    <span className="w">wallet</span>
                                </span>
                                <span className="line">
                                    <span className="w">hits</span> <span className="w">a</span>{" "}
                                    <span className="w">total</span> <span className="w">of</span>{" "}
                                    <span className="pill" data-pill="goal">
                                        <span className="pill__bg" />
                                        <span className="pill__t">0.2 BTC</span>
                                    </span>
                                    <span className="w">.</span>
                                </span>
                            </p>
                        </div>

                        <div className="finish-wrap">
                            <p className="footnote">
                                At the current price of <b>$79,450</b>, this will take
                                approximately <b>24 months</b>. Cancel or pause anytime.
                            </p>
                            <button className="btn--finish" type="button">
                                Finish setup
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

type Props = {
    sheetOnly: boolean
    sheetZoom: number
    fontFamily: string
    titleSize: number
    labelSize: number
    valueSize: number
    valueTrack: number
    valueWeight: number
    disclaimerSize: number
    buttonSize: number
    buttonRadius: number
    sentenceSize: number
    sentenceTrack: number
    footnoteSize: number
    finishSize: number
    backSheetShade: number
    topShadow: number
    topShadowBlur: number
    accent: string
    ink: string
    labelColor: string
    sheetColor: string
    backSheetColor: string
    backButton: string
    background: string
    hairline: boolean
    holdTime: number
    retract: number
    fillIntensity: number
    sheetDuration: number
    showWash: boolean
    distortion: number
    swirl: number
    tint: number
    rimDepth: number
    hue: number
    wipeSpeed: number
    style?: React.CSSProperties
}

DCAFlow.defaultProps = {
    sheetOnly: false,
    sheetZoom: 1.2,
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"SF Pro Display\", \"Helvetica Neue\", Arial, sans-serif",
    titleSize: 18,
    labelSize: 13,
    valueSize: 34,
    valueTrack: -0.85,
    valueWeight: 400,
    disclaimerSize: 11.5,
    buttonSize: 14,
    buttonRadius: 999,
    sentenceSize: 36,
    sentenceTrack: -0.72,
    footnoteSize: 13,
    finishSize: 14,
    backSheetShade: 0,
    topShadow: 0.06,
    topShadowBlur: 14,
    accent: "#3236ff",
    ink: "#000000",
    labelColor: "rgba(37, 37, 37, 0.35)",
    sheetColor: "#ffffff",
    backSheetColor: "#fbfbfb",
    backButton: "#252525",
    background: "transparent",
    hairline: true,
    holdTime: 1100,
    retract: 870,
    fillIntensity: 72,
    sheetDuration: 1092,
    showWash: true,
    distortion: 100,
    swirl: 70,
    tint: 100,
    rimDepth: 50,
    hue: 50,
    wipeSpeed: 1000,
}

addPropertyControls(DCAFlow, {
    sheetOnly: { type: ControlType.Boolean, title: "Sheet only", defaultValue: false, description: "Just the bottom sheet, without the phone around it" },
    sheetZoom: { type: ControlType.Number, title: "Sheet size", min: 0.8, max: 1.6, step: 0.01, defaultValue: 1.2, description: "How big the sheet shows at rest (Sheet only); it returns to 1 as it expands", hidden: (p: Props) => !p.sheetOnly },
    background: { type: ControlType.Color, title: "Background", defaultValue: "transparent" },
    hairline: { type: ControlType.Boolean, title: "Phone line", defaultValue: true },
    fontFamily: { type: ControlType.String, title: "Font", defaultValue: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"SF Pro Display\", \"Helvetica Neue\", Arial, sans-serif" },
    titleSize: { type: ControlType.Number, title: "Title size", defaultValue: 18, min: 12, max: 26, step: 0.5, unit: "px" },
    labelSize: { type: ControlType.Number, title: "Label size", defaultValue: 13, min: 9, max: 18, step: 0.5, unit: "px" },
    valueSize: { type: ControlType.Number, title: "Value size", defaultValue: 34, min: 20, max: 44, step: 0.5, unit: "px" },
    valueTrack: { type: ControlType.Number, title: "Value letter spacing", defaultValue: -0.85, min: -3, max: 2, step: 0.05, unit: "px" },
    valueWeight: { type: ControlType.Number, title: "Value weight", defaultValue: 400, min: 300, max: 700, step: 50 },
    disclaimerSize: { type: ControlType.Number, title: "Disclaimer size", defaultValue: 11.5, min: 8, max: 15, step: 0.5, unit: "px" },
    buttonSize: { type: ControlType.Number, title: "Button text size", defaultValue: 14, min: 10, max: 20, step: 0.5, unit: "px" },
    buttonRadius: { type: ControlType.Number, title: "Button radius", defaultValue: 999, min: 0, max: 999, step: 1, unit: "px" },
    sentenceSize: { type: ControlType.Number, title: "Summary size", defaultValue: 36, min: 22, max: 44, step: 0.5, unit: "px" },
    sentenceTrack: { type: ControlType.Number, title: "Summary letter spacing", defaultValue: -0.72, min: -3, max: 2, step: 0.05, unit: "px" },
    finishSize: { type: ControlType.Number, title: "Finish button text size", defaultValue: 14, min: 10, max: 22, step: 0.5, unit: "px" },
    footnoteSize: { type: ControlType.Number, title: "Footnote size", defaultValue: 13, min: 9, max: 18, step: 0.5, unit: "px" },
    accent: { type: ControlType.Color, title: "Accent colour", defaultValue: "#3236ff" },
    ink: { type: ControlType.Color, title: "Text colour", defaultValue: "#000000" },
    labelColor: { type: ControlType.Color, title: "Label colour", defaultValue: "rgba(37, 37, 37, 0.35)" },
    sheetColor: { type: ControlType.Color, title: "Sheet colour", defaultValue: "#ffffff" },
    backSheetShade: { type: ControlType.Number, title: "Back sheet shade", defaultValue: 0, min: 0, max: 40, step: 0.5, unit: "%", description: "Darkens the back sheet colour; 0 = as set" },
    topShadow: { type: ControlType.Number, title: "Sheet top shadow", defaultValue: 0.06, min: 0, max: 0.3, step: 0.005, description: "Shadow off the main sheet's top edge; 0 = none" },
    topShadowBlur: { type: ControlType.Number, title: "Sheet top shadow blur", defaultValue: 14, min: 2, max: 40, step: 1, unit: "px" },
    backSheetColor: { type: ControlType.Color, title: "Back sheet colour", defaultValue: "#fbfbfb" },
    backButton: { type: ControlType.Color, title: "Back button colour", defaultValue: "#252525" },
    holdTime: { type: ControlType.Number, title: "Hold time", defaultValue: 1100, min: 300, max: 2000, step: 50, unit: "ms" },
    retract: { type: ControlType.Number, title: "Retract", defaultValue: 870, min: 100, max: 1600, step: 10, unit: "ms" },
    fillIntensity: { type: ControlType.Number, title: "Fill", defaultValue: 72, min: 0, max: 100, unit: "%" },
    sheetDuration: { type: ControlType.Number, title: "Sheet", defaultValue: 1092, min: 400, max: 2200, step: 10, unit: "ms" },
    showWash: { type: ControlType.Boolean, title: "Wash", defaultValue: true },
    distortion: { type: ControlType.Number, title: "Distortion", defaultValue: 100, min: 0, max: 100, unit: "%", hidden: (p: Props) => !p.showWash },
    swirl: { type: ControlType.Number, title: "Swirl", defaultValue: 70, min: 0, max: 100, unit: "%", hidden: (p: Props) => !p.showWash },
    tint: { type: ControlType.Number, title: "Tint", defaultValue: 100, min: 0, max: 100, unit: "%", hidden: (p: Props) => !p.showWash },
    rimDepth: { type: ControlType.Number, title: "Rim depth", defaultValue: 50, min: 0, max: 100, unit: "%", hidden: (p: Props) => !p.showWash },
    hue: { type: ControlType.Number, title: "Hue", defaultValue: 50, min: 0, max: 100, unit: "%", hidden: (p: Props) => !p.showWash },
    wipeSpeed: { type: ControlType.Number, title: "Wipe", defaultValue: 1000, min: 400, max: 2200, step: 10, unit: "ms" },
})

/* ------------------------------------------------------------------------ */
/*  Behaviour. Everything below is imperative: the animation is driven by    */
/*  measured geometry, so it lives outside React's render cycle on purpose.  */
/* ------------------------------------------------------------------------ */

function mount(root: HTMLDivElement, P: () => Props): () => void {
    const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as unknown as T
    const qa = <T extends Element = HTMLElement>(sel: string) =>
        Array.from(root.querySelectorAll(sel)) as unknown as T[]

    const fit = q(".dca-fit")
    const screen = q(".screen")
    const sheet = q(".sheet")
    const sheetBack = q(".sheet-back")
    const spacer = q(".spacer")
    const rows = q(".rows")
    const shader = q(".shader")
    const summary = q(".summary")
    const sentence = q(".sentence")
    const footnote = q(".footnote")
    const confirmBtn = q<HTMLButtonElement>(".btn--confirm")
    const holdFill = q(".btn__fill")
    const finishBtn = q<HTMLButtonElement>(".btn--finish")
    const wipe = q(".wipe")
    const statusBar = q(".status-bar")
    const wash = q<HTMLCanvasElement>(".wash")

    let dead = false
    let timers: number[] = []
    const after = (ms: number, fn: () => void) => {
        timers.push(window.setTimeout(() => !dead && fn(), ms))
    }
    const clearTimers = () => {
        timers.forEach(clearTimeout)
        timers = []
    }

    /* ---- fit the 402 x 874 phone into whatever frame Framer gives us ---- */
    // Every measurement below is divided by this, because getBoundingClientRect
    // reports scaled screen pixels while transforms inside work in layout pixels.
    let scale = 1
    const refit = () => {
        const w = root.clientWidth
        const h = root.clientHeight
        if (!w || !h) return
        scale = Math.min(w / W, h / H)
        place()
    }
    // Sheet only: the resting sheet (at the bottom of the phone) is moved up to sit
    // centred; when it expands to full height it glides back to the middle with it.
    let lift = 0
    ;(root as any).__dcaPlace = () => place()
    // At rest it also shows a little bigger (Sheet size); expanding returns it to the
    // fitted size as it grows.
    const place = () => {
        const resting = P().sheetOnly && !sheet.classList.contains("is-full")
        const dy = resting ? -lift : 0
        const zoom = resting ? P().sheetZoom || 1 : 1
        fit.style.transform = `translate(-50%, -50%) scale(${scale * zoom}) translateY(${dy}px)`
    }
    const ro = new ResizeObserver(refit)
    ro.observe(root)
    refit()

    /* ---- resting geometry ---- */
    const PEEK = 13
    let NATURAL = 0
    const pinSheetHeight = () => {
        if (sheet.classList.contains("is-full")) return
        sheet.style.height = ""
        NATURAL = sheet.offsetHeight
        sheet.style.height = NATURAL + "px"
        sheetBack.style.height = NATURAL + PEEK + "px"
        lift = (H - NATURAL) / 2
        place()
    }

    // The five sentence lines are fixed; shrink only if a fallback font overflows.
    const fitSentence = () => {
        sentence.style.fontSize = ""
        const avail = summary.clientWidth
        let widest = 0
        qa(".line").forEach((l) => (widest = Math.max(widest, l.scrollWidth)))
        if (widest > avail && widest > 0) sentence.style.fontSize = (((P().sentenceSize || 36) * avail) / widest).toFixed(2) + "px"
    }

    pinSheetHeight()
    fitSentence()
    document.fonts?.ready.then(() => {
        if (dead) return
        pinSheetHeight()
        fitSentence()
    })

    /* ---- 1: expand the sheet ---- */
    const MORPH = 1064
    const REST_TOP = 190
    const EASE = "cubic-bezier(0.32, 0.72, 0, 1)"

    let spacerRest = 0
    function run() {
        confirmBtn.disabled = true
        root.classList.add("dca--active") // from a successful hold until the reset
        const dur = Math.round(P().sheetDuration)

        // Freeze the flexible spacer, then grow it alongside the sheet so the
        // rows ride up but stop short of the status bar.
        spacer.style.flex = "none"
        spacerRest = spacer.offsetHeight
        spacer.style.height = spacerRest + "px"
        spacer.style.transition = `height ${dur}ms ${EASE}`
        requestAnimationFrame(() => (spacer.style.height = REST_TOP + "px"))

        qa(".fades-out").forEach((el) => el.classList.add("is-gone"))
        sheetBack.classList.add("is-gone")
        sheet.style.transition = `height ${dur}ms ${EASE}, border-radius ${dur}ms ${EASE}`
        requestAnimationFrame(() => {
            sheet.classList.add("is-full")
            root.classList.add("dca--full")
            sheet.style.height = H + "px"
            fit.style.transition = `transform ${dur}ms ${EASE}`
            place()
        })

        after(1148, morph)
    }

    /* ---- 2: values fly into pills ---- */
    // The REAL pill text is transformed back onto the source glyphs, then
    // released to identity — no clone, so there is no handoff to snap.
    function morph() {
        summary.classList.add("is-live")
        const sr = screen.getBoundingClientRect()

        const moves = ["day", "amount", "coin", "goal"].map((name) => {
            const srcWrap = q(`.row__value[data-token="${name}"]`)
            const src = srcWrap.querySelector(".tok") as HTMLElement
            const drop = srcWrap.querySelector(".drop") as HTMLElement | null
            const pill = q(`.pill[data-pill="${name}"]`)
            const target = pill.querySelector(".pill__t") as HTMLElement

            const s = src.getBoundingClientRect()
            const t = target.getBoundingClientRect()
            const k = s.width / t.width
            const dx = (s.left - t.left) / scale
            const dy = (s.top + s.height / 2 - t.top - (t.height * k) / 2) / scale

            target.style.transformOrigin = "top left"
            target.style.transition = "none"
            target.style.transform = `translate(${dx}px, ${dy}px) scale(${k})`
            target.style.color = "#000"
            target.classList.add("is-in")
            void target.offsetWidth // commit before release

            // "Every " fades out in place
            if (drop) {
                const d = drop.getBoundingClientRect()
                const dc = document.createElement("span")
                dc.className = "drop-clone"
                dc.textContent = drop.textContent
                screen.appendChild(dc)
                dc.style.left = (d.left - sr.left) / scale + "px"
                dc.style.top = (d.top - sr.top) / scale + d.height / scale / 2 - dc.offsetHeight / 2 + "px"
                requestAnimationFrame(() => (dc.style.opacity = "0"))
            }
            return { pill, target }
        })

        rows.style.transition = "opacity 110ms ease-out"
        rows.style.opacity = "0"

        requestAnimationFrame(() => {
            moves.forEach((m) => {
                m.target.style.transition = `transform ${MORPH}ms ${EASE}, color ${MORPH * 0.55}ms ease-out`
                m.target.style.transform = "none"
                m.target.style.color = ""
            })
        })

        after(MORPH * 0.18, () => {
            if (!P().showWash) return
            shader.classList.add("is-in")
            startWash()
        })
        after(MORPH * 0.2, () => moves.forEach((m) => m.pill.querySelector(".pill__bg")!.classList.add("is-in")))
        after(MORPH, () => {
            moves.forEach((m) => m.pill.querySelector(".pill__x")?.classList.add("is-in"))
            qa(".drop-clone").forEach((el) => el.remove())
        })

        const words = qa(".w")
        words.forEach((w, i) => after(MORPH * 0.5 + i * 59, () => w.classList.add("is-in")))

        const sentenceEnd = MORPH * 0.5 + words.length * 59
        after(sentenceEnd + 220, () => footnote.classList.add("is-in"))
        after(sentenceEnd + 1000, () => finishBtn.classList.add("is-in"))
    }

    /* ---- 3: blue wipe, rebuild behind it, loop ---- */
    // Sheet only: no blue wipe (it is made for a whole phone); the expansion plays
    // backwards instead: the summary fades, the sheet shrinks back to its resting size
    // and zoom, and the rows fade back in.
    function closeSheet() {
        if (closing) return
        closing = true
        finishBtn.disabled = true
        const dur = Math.round(P().sheetDuration)
        const fade = "opacity 260ms ease-out"
        ;[summary, footnote, finishBtn, shader].forEach((el) => {
            el.style.transition = fade
            el.style.opacity = "0"
        })
        root.classList.remove("dca--full")
        after(240, () => {
            stopWash()
            sheet.style.transition = `height ${dur}ms ${EASE}, border-radius ${dur}ms ${EASE}`
            sheet.classList.remove("is-full")
            sheet.style.height = NATURAL + "px"
            fit.style.transition = `transform ${dur}ms ${EASE}`
            place()
            spacer.style.transition = `height ${dur}ms ${EASE}`
            spacer.style.height = spacerRest + "px"
            sheetBack.classList.remove("is-gone")
            after(dur * 0.45, () => {
                rows.style.transition = "opacity 300ms ease-out"
                rows.style.opacity = ""
                qa(".fades-out").forEach((el) => el.classList.remove("is-gone"))
            })
            after(dur + 60, () => {
                // everything now looks as at rest; put the rest of the state back
                ;[summary, footnote, finishBtn, shader].forEach((el) => {
                    el.style.transition = "none"
                    el.style.opacity = ""
                })
                reset()
                void root.offsetWidth
                ;[summary, footnote, finishBtn, shader].forEach((el) => (el.style.transition = ""))
                closing = false
                finishBtn.disabled = false
            })
        })
    }
    let closing = false

    function finishLoop() {
        if (P().sheetOnly) return closeSheet()
        if (wipe.classList.contains("is-up")) return
        finishBtn.disabled = true
        const sp = P().wipeSpeed

        wipe.classList.remove("is-out")
        wipe.style.transition = `transform ${sp}ms ${EASE}`
        wipe.classList.add("is-up")
        // solved from the easing + gradient geometry: the blue reaches the
        // status bar ~26% into the rise and clears it ~54% into the exit
        after(sp * 0.26, () => statusBar.classList.add("is-light"))
        after(sp, () => {
            reset()
            wipe.classList.remove("is-up")
            wipe.style.transition = `transform ${sp}ms cubic-bezier(0.4, 0, 0.2, 1)`
            wipe.classList.add("is-out")
            after(sp * 0.54, () => statusBar.classList.remove("is-light"))
            after(sp, () => {
                wipe.style.transition = "none"
                wipe.classList.remove("is-out")
                finishBtn.disabled = false
            })
        })
    }

    function reset() {
        clearTimers()
        qa(".drop-clone").forEach((el) => el.remove())
        sheet.classList.remove("is-full")
        root.classList.remove("dca--full", "dca--active")
        sheet.style.transition = ""
        sheet.style.height = NATURAL + "px"
        fit.style.transition = "none"
        place()
        sheetBack.classList.remove("is-gone")
        shader.classList.remove("is-in")
        stopWash()
        summary.classList.remove("is-live")
        finishBtn.classList.remove("is-in")
        footnote.classList.remove("is-in")
        rows.style.opacity = ""
        rows.style.transition = ""
        spacer.style.flex = ""
        spacer.style.height = ""
        spacer.style.transition = ""
        qa(".fades-out").forEach((el) => el.classList.remove("is-gone"))
        qa(".w, .pill__bg").forEach((el) => el.classList.remove("is-in"))
        qa(".pill__t, .pill__x").forEach((el) => {
            el.classList.remove("is-in")
            el.style.transition = ""
            el.style.transform = ""
            el.style.color = ""
            el.style.transformOrigin = ""
        })
        confirmBtn.disabled = false
        confirmBtn.style.transform = ""
        holdFill.style.transition = "none"
        holdFill.style.width = "0px"
        holdFill.style.opacity = ""
        holding = false
        fired = false
    }

    /* ---- hold to confirm ---- */
    // Timed by a plain setTimeout, so firing never depends on anything visual.
    let holding = false
    let fired = false
    let holdTimer = 0

    function holdStart(e: PointerEvent | MouseEvent | TouchEvent) {
        if (!holdTimer) holding = false
        if (confirmBtn.disabled || holding) return
        if (e.cancelable) e.preventDefault()

        const p = P()
        const r = confirmBtn.getBoundingClientRect()
        const bw = confirmBtn.offsetWidth
        const bh = confirmBtn.offsetHeight
        // shrink exactly 2px on each axis — the width is fluid, so one uniform
        // scale would take more off the width than the height
        confirmBtn.style.transform = `scale(${(bw - 2) / bw}, ${(bh - 2) / bh})`

        // open the fill outward from wherever the press landed
        const cx = "touches" in e ? e.touches[0]?.clientX : (e as PointerEvent).clientX
        const at = cx == null ? bw / 2 : Math.max(0, Math.min(bw, (cx - r.left) / scale))
        const reach = 2 * Math.max(at, bw - at) + 140
        const pk = (p.fillIntensity / 100) * 0.85
        const ed = pk * 0.33
        holdFill.style.background = `linear-gradient(90deg, rgba(255,255,255,${ed}) 0%, rgba(255,255,255,${pk}) 50%, rgba(255,255,255,${ed}) 100%)`
        holdFill.style.transition = "none"
        holdFill.style.left = at + "px"
        holdFill.style.width = "0px"
        holdFill.style.opacity = ""
        void holdFill.offsetWidth
        holdFill.style.transition = `width ${p.holdTime}ms linear`
        holdFill.style.width = reach + "px"

        holding = true
        fired = false
        clearTimeout(holdTimer)
        holdTimer = window.setTimeout(holdComplete, p.holdTime)
    }

    function holdComplete() {
        holdTimer = 0
        if (fired || dead) return
        fired = true
        holding = false
        confirmBtn.style.transform = ""
        holdFill.style.transition = "opacity 200ms ease-out"
        holdFill.style.opacity = "0"
        run()
    }

    function holdCancel() {
        clearTimeout(holdTimer)
        holdTimer = 0
        confirmBtn.style.transform = ""
        if (holding) {
            holdFill.style.transition = `width ${P().retract}ms cubic-bezier(0.22, 1, 0.36, 1)`
            holdFill.style.width = "0px"
        }
        holding = false
    }

    // Capture-phase + rect hit-test on the root, so a press registers even if
    // something transparent sits above the button.
    const over = (el: HTMLElement, x?: number, y?: number) => {
        if (x == null || y == null) return false
        const r = el.getBoundingClientRect()
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    }
    let sawPointer = false
    let pressWorked = false
    const onPointerDown = (e: PointerEvent) => {
        sawPointer = true
        if (!confirmBtn.disabled && over(confirmBtn, e.clientX, e.clientY)) {
            pressWorked = true
            holdStart(e)
        }
    }
    const onMouseDown = (e: MouseEvent) => {
        if (!sawPointer && !confirmBtn.disabled && over(confirmBtn, e.clientX, e.clientY)) {
            pressWorked = true
            holdStart(e)
        }
    }
    // Last resort, decided per interaction: if this click's own press never
    // started a hold, press events aren't reaching us, so the click confirms.
    const onClick = (e: MouseEvent) => {
        const worked = pressWorked
        pressWorked = false
        if (over(finishBtn, e.clientX, e.clientY) && !finishBtn.disabled && finishBtn.classList.contains("is-in")) {
            finishLoop()
            return
        }
        if (!over(confirmBtn, e.clientX, e.clientY)) return
        if (worked || fired || holding || confirmBtn.disabled) return
        holdComplete()
    }
    root.addEventListener("pointerdown", onPointerDown, true)
    root.addEventListener("mousedown", onMouseDown, true)
    root.addEventListener("click", onClick, true)
    window.addEventListener("pointerup", holdCancel)
    window.addEventListener("pointercancel", holdCancel)

    /* ---- background wash (WebGL) ---- */
    let gl: WebGLRenderingContext | null = null
    const uni: Record<string, WebGLUniformLocation | null> = {}
    let washRaf = 0
    let washT0 = 0
    let washOK = false

    // Safari reclaims WebGL contexts when graphics memory runs low (and then paints a
    // sad-face placeholder where the canvas was). So: build the program in a function
    // that can run again, rebuild when Safari hands the context back, and hide the
    // canvas behind a CSS stand-in of the wash while it's gone.
    const initGL = () => {
        washOK = false
        try {
            gl = wash.getContext("webgl", { alpha: false, antialias: false, depth: false })
            if (!gl || gl.isContextLost()) return
            const g = gl
            const sh = (type: number, src: string) => {
                const o = g.createShader(type)!
                g.shaderSource(o, src)
                g.compileShader(o)
                if (!g.getShaderParameter(o, g.COMPILE_STATUS)) return null
                return o
            }
            const vs = sh(g.VERTEX_SHADER, VERT)
            const fs = sh(g.FRAGMENT_SHADER, WASH_FRAG)
            if (!vs || !fs) return
            const prog = g.createProgram()!
            g.attachShader(prog, vs)
            g.attachShader(prog, fs)
            g.linkProgram(prog)
            if (!g.getProgramParameter(prog, g.LINK_STATUS)) return
            g.useProgram(prog)
            const buf = g.createBuffer()
            g.bindBuffer(g.ARRAY_BUFFER, buf)
            g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW)
            const loc = g.getAttribLocation(prog, "aPos")
            g.enableVertexAttribArray(loc)
            g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0)
            ;["uRes", "uTime", "uEnter", "uDistort", "uSwirl", "uTint", "uDepth", "uHue"].forEach(
                (k) => (uni[k] = g.getUniformLocation(prog, k))
            )
            const d = Math.min(window.devicePixelRatio || 1, 1.75)
            wash.width = Math.round(W * d)
            wash.height = Math.round(H * d)
            g.viewport(0, 0, wash.width, wash.height)
            washOK = true
        } catch {
            washOK = false
        } finally {
            shader.classList.toggle("is-lost", !washOK)
        }
    }
    initGL()
    const onLost = (e: Event) => {
        e.preventDefault() // lets the browser restore it later
        washOK = false
        if (washRaf) cancelAnimationFrame(washRaf)
        washRaf = 0
        shader.classList.add("is-lost")
    }
    const onRestored = () => {
        initGL()
        if (washOK && shader.classList.contains("is-in")) startWash()
    }
    wash.addEventListener("webglcontextlost", onLost)
    wash.addEventListener("webglcontextrestored", onRestored)

    const WASH_ENTER = 1700
    function washFrame(t: number) {
        if (!gl || dead) return
        if (!washT0) washT0 = t
        let e = Math.min(1, (t - washT0) / WASH_ENTER)
        e = e * e * e * (e * (e * 6 - 15) + 10) // smootherstep
        const p = P()
        try {
            gl.uniform2f(uni.uRes, wash.width, wash.height)
            gl.uniform1f(uni.uTime, (t - washT0) / 1000)
            gl.uniform1f(uni.uEnter, e)
            gl.uniform1f(uni.uDistort, p.distortion / 50)
            gl.uniform1f(uni.uSwirl, p.swirl / 50)
            gl.uniform1f(uni.uTint, p.tint / 100)
            gl.uniform1f(uni.uDepth, p.rimDepth / 100)
            gl.uniform1f(uni.uHue, p.hue / 100)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        } catch {
            washOK = false
        }
        if (!washOK || gl.isContextLost()) {
            washOK = false
            shader.classList.add("is-lost")
        }
        washRaf = washOK ? requestAnimationFrame(washFrame) : 0
    }
    function startWash() {
        if (!washOK || washRaf) return
        washRaf = requestAnimationFrame(washFrame)
    }
    function stopWash() {
        if (washRaf) cancelAnimationFrame(washRaf)
        washRaf = 0
        washT0 = 0
    }

    /* ---- teardown ---- */
    return () => {
        dead = true
        clearTimers()
        clearTimeout(holdTimer)
        stopWash()
        ro.disconnect()
        wash.removeEventListener("webglcontextlost", onLost)
        wash.removeEventListener("webglcontextrestored", onRestored)
        root.removeEventListener("pointerdown", onPointerDown, true)
        root.removeEventListener("mousedown", onMouseDown, true)
        root.removeEventListener("click", onClick, true)
        window.removeEventListener("pointerup", holdCancel)
        window.removeEventListener("pointercancel", holdCancel)
        gl?.getExtension("WEBGL_lose_context")?.loseContext()
    }
}

/* ------------------------------------------------------------------------ */
/*  Shaders                                                                  */
/* ------------------------------------------------------------------------ */

const VERT = `attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const WASH_FRAG = `precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform float uEnter;
uniform float uDistort;
uniform float uSwirl;
uniform float uTint;
uniform float uDepth;
uniform float uHue;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 c  = vec2(uv.x - 0.5, uv.y - 0.54);
  c.x *= uRes.x / uRes.y;
  vec2  p = c * 3.4;
  float t = uTime * 0.06;
  float e = uEnter;

  // two rounds of domain warping: the second gives the finer filigree
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(3.1, 1.7) - t));
  vec2 r = vec2(fbm3(p + 1.9 * q * uSwirl + vec2(1.7, 9.2) + t * 0.6),
                fbm3(p + 1.9 * q * uSwirl + vec2(8.3, 2.8) - t * 0.5));
  float flow = fbm(p + 2.6 * r * uSwirl);
  float fine = fbm(p * 3.4 + 2.4 * r + vec2(-t * 1.3, t));

  float d = length(c) + ((flow - 0.5) * 0.22 + (fine - 0.5) * 0.10) * e * uDistort;

  // opens from the centre and ends with the rim just past the corners
  float R = mix(0.04, 0.68, e) + sin(uTime * 0.18) * 0.035 * e;

  float x    = (d - R) / 0.24;
  float band = exp(-x * x) * (0.72 + 0.55 * flow);
  float core = 1.0 - smoothstep(0.0, R * 1.05, d);
  float outer = 1.0 - smoothstep(R + 0.10, R + 0.60, d);
  float settle   = smoothstep(0.45, 1.0, e);
  float coreTint = core * mix(0.34, 0.07, settle);
  float amt = clamp(coreTint + band * 0.72, 0.0, 1.0) * outer;

  vec3 white = vec3(1.0);
  vec3 pale  = mix(vec3(0.820, 0.920, 1.0), vec3(0.900, 0.840, 1.0), uHue);
  vec3 deep  = mix(vec3(0.660, 0.840, 1.0), vec3(0.800, 0.700, 1.0), uHue);
  vec3 col   = mix(white, pale, amt * uTint);
  col = mix(col, deep, band * outer * uDepth);

  // calm, readable zone behind the sentence
  vec2  sfz  = vec2(c.x / 0.30, c.y / 0.17);
  float safe = 1.0 - smoothstep(0.55, 1.50, length(sfz));
  col = mix(col, white, safe * mix(0.55, 0.82, settle));

  // white pocket behind the footnote, arriving when the footnote does
  float fy      = (uv.y - 0.155) / 0.085;
  float clearIn = smoothstep(1.55, 2.45, uTime);
  col = mix(col, white, exp(-fy * fy) * 0.92 * clearIn);

  gl_FragColor = vec4(col, 1.0);
}`

/* ------------------------------------------------------------------------ */
/*  Styles — every selector is scoped under .dca                            */
/* ------------------------------------------------------------------------ */

const CSS = `
.dca, .dca * { box-sizing: border-box; margin: 0; padding: 0; }
.dca {
  font-family: var(--dca-font, -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}
.dca .dca-fit {
  position: absolute; left: 50%; top: 50%;
  width: ${W}px; height: ${H}px;
  transform-origin: 50% 50%;
  transform: translate(-50%, -50%);
}
.dca .screen {
  position: relative; width: ${W}px; height: ${H}px;
  background: #f6f6f6; border-radius: 50px; overflow: hidden;
}
.dca .screen--line::after {
  content: ""; position: absolute; inset: 0; border-radius: 50px;
  box-shadow: inset 0 0 0 0.5px rgba(37, 37, 37, 0.1);
  pointer-events: none; z-index: 50;
}

.dca .status-bar {
  position: absolute; top: 10px; left: 20px; width: 362px; height: 44px;
  z-index: 30; color: #000; transition: color 90ms linear; pointer-events: none;
}
.dca .status-bar.is-light { color: #fff; }
.dca .status-bar svg { display: block; width: 362px; height: 44px; }

.dca .sheet-back {
  position: absolute; left: 14px; right: 14px; bottom: 0;
  /* the colour, darkened by "Back sheet shade" */
  background: color-mix(in srgb, var(--dca-back-sheet, #fbfbfb), #000 var(--dca-back-shade, 0%));
  border-radius: 30px 30px 0 0; z-index: 9;
  transition: opacity 260ms ease-out;
}
.dca .sheet-back.is-gone { opacity: 0; }

.dca .sheet {
  position: absolute; left: 0; bottom: 0; width: ${W}px; height: auto;
  background: var(--dca-sheet, #fff); border-radius: 30px 30px 0 0; padding: 0 24px 38px;
  display: flex; flex-direction: column; z-index: 10; overflow: hidden;
  /* a soft shadow off its top edge, so the sheet behind reads as a separate layer */
  box-shadow: 0 calc(var(--dca-top-shadow-blur, 14px) / -4) var(--dca-top-shadow-blur, 14px) rgba(0, 0, 0, var(--dca-top-shadow, 0.06));
}
.dca .sheet.is-full { border-radius: 50px; }

.dca .shader {
  position: absolute; left: 0; right: 0; bottom: 0; height: ${H}px;
  z-index: 0; opacity: 0; pointer-events: none;
  transform: scale(1.10); transform-origin: 50% 45%;
}
.dca .shader.is-in {
  opacity: 1; transform: scale(1);
  transition: opacity 240ms linear, transform 1800ms cubic-bezier(0.16, 1, 0.3, 1);
}
.dca .shader canvas { display: block; width: 100%; height: 100%; }
/* WebGL unavailable or lost: no canvas (Safari would show a sad face), a soft CSS
   version of the wash instead */
.dca .shader.is-lost canvas { display: none; }
.dca .shader.is-lost {
  background:
    radial-gradient(ellipse 62% 40% at 50% 46%, #ffffff 0%, #ffffff 45%, rgba(255,255,255,0) 75%),
    radial-gradient(ellipse 120% 85% at 50% 46%, #ffffff 30%, #e3edff 62%, #d5dcff 82%, #eef1ff 100%);
}

.dca .sheet__handle {
  position: absolute; top: 13.5px; left: 50%; transform: translateX(-50%);
  width: 35px; height: 3px; border-radius: 1.5px; background: #a6a6a6; z-index: 3;
}
.dca .sheet__header {
  position: relative; z-index: 2; display: flex; align-items: center;
  justify-content: space-between; margin-top: 30px; padding-bottom: 35px;
}
.dca .sheet__title {
  font-size: var(--dca-title-size, 18px); font-weight: 500; line-height: 0.72; letter-spacing: -0.4px; color: var(--dca-ink, #000);
}
.dca .sheet__step { display: flex; align-items: center; gap: 3px; }
.dca .sheet__dot { width: 8px; height: 3px; border-radius: 1.5px; background: rgba(19, 23, 218, 0.15); }
.dca .sheet__dot--on { width: 20px; background: var(--dca-accent, rgba(19, 23, 218, 0.9)); }

.dca .spacer { flex: 1 1 auto; min-height: 0; }

.dca .rows { position: relative; z-index: 2; flex: none; display: flex; flex-direction: column; gap: 30px; }
.dca .row { display: flex; align-items: flex-end; justify-content: space-between; }
/* On griep.design the carousel is also a ".row" (width 100%, overflow hidden), which
   clipped the descenders here ("Every Monday"); undo it inside the component */
.dca .row { width: auto; overflow: visible; touch-action: auto; }

/* Sheet only: no phone around it (no screen, outline, status bar or the peeking
   card behind), and the sheet rounded all round */
.dca--sheet .screen { background: transparent; }
.dca--sheet .screen--line::after { display: none; }
/* the status bar only once the sheet has grown into the whole screen */
.dca--sheet .status-bar { opacity: 0; transition: opacity 300ms ease, color 90ms linear; }
.dca--sheet.dca--full .status-bar { opacity: 1; transition-delay: 450ms, 0ms; }
.dca--sheet .sheet { border-radius: 30px; }
.dca--sheet .sheet-back { border-radius: 30px; }
.dca--sheet .sheet.is-full { border-radius: 50px; }
.dca .row--payment { align-items: center; }
.dca .row__label {
  font-size: var(--dca-label-size, 13px); font-weight: 500; line-height: 1; letter-spacing: -0.1px;
  color: var(--dca-label, rgba(37, 37, 37, 0.35));
}
.dca .row__value {
  font-size: var(--dca-value-size, 34px); font-weight: var(--dca-value-weight, 400); line-height: 0.72; letter-spacing: var(--dca-value-track, -0.85px);
  color: var(--dca-ink, #000); white-space: nowrap;
}
.dca .payment__right { display: flex; align-items: center; gap: 10px; }
.dca .payment__digits, .dca .payment__digits svg { display: block; width: 50px; height: 9px; }
.dca .payment__card, .dca .payment__card svg { display: block; width: 38px; height: 23px; }

.dca .disclaimer {
  position: relative; z-index: 2; flex: none; margin-top: 26px;
  font-size: var(--dca-disclaimer-size, 11.5px); font-weight: 500; line-height: 1.3; letter-spacing: -0.25px;
  color: rgba(0, 0, 0, 0.25);
}

.dca .actions { position: relative; z-index: 2; display: flex; flex: none; gap: 8px; margin: 23px 0 10px; }
.dca .btn {
  flex: 1 1 0; border: none; padding: 16.5px 8px; border-radius: var(--dca-button-radius, 999px);
  font: inherit; font-size: var(--dca-button-size, 14px); font-weight: 500; line-height: 1.2; letter-spacing: -0.1px;
  color: #fff; cursor: pointer;
}
.dca .btn--back { flex: 0 0 100px; background: var(--dca-back-btn, #252525); cursor: default; }
.dca .btn--confirm {
  position: relative; overflow: hidden; background: var(--dca-accent, #3236ff);
  transition: transform 130ms cubic-bezier(0.22, 1, 0.36, 1);
  -webkit-user-select: none; user-select: none; touch-action: none;
}
.dca .btn__fill {
  position: absolute; top: -24px; bottom: -24px; left: 0; width: 0;
  transform: translateX(-50%); filter: blur(33px); z-index: 0; pointer-events: none;
}
.dca .btn__label { position: relative; z-index: 1; pointer-events: none; }

.dca .fades-out { transition: opacity 308ms ease-out; }
.dca .fades-out.is-gone { opacity: 0; pointer-events: none; }

.dca .summary {
  position: absolute; z-index: 2; left: 20px; right: 20px; top: 46%;
  transform: translateY(-50%); opacity: 0; pointer-events: none;
}
.dca .summary.is-live { opacity: 1; }
.dca .sentence {
  text-align: left; font-size: var(--dca-sentence-size, 36px); font-weight: 400; line-height: 1.18;
  letter-spacing: var(--dca-sentence-track, -0.72px); color: var(--dca-ink, #000);
}
.dca .sentence .line { display: block; white-space: nowrap; }
.dca .w { opacity: 0; transform: translateY(6px); }
.dca .w.is-in {
  opacity: 1; transform: translateY(0);
  transition: opacity 644ms ease-out, transform 644ms cubic-bezier(0.22, 1, 0.36, 1);
}

.dca .pill {
  position: relative; display: inline-block;
  padding: 0.111em 0.25em 0.139em; border-radius: 0.25em;
  vertical-align: middle; line-height: 0;
}
.dca .pill__bg {
  position: absolute; inset: 0; border-radius: 0.25em; background: var(--dca-accent, #3236ff);
  opacity: 0; transform: scale(0.82);
}
.dca .pill__bg.is-in {
  opacity: 1; transform: scale(1);
  transition: opacity 380ms ease-out, transform 470ms cubic-bezier(0.34, 1.4, 0.5, 1);
}
.dca .pill__t, .dca .pill__x {
  position: relative; display: inline-block; font-size: 0.444em; font-weight: 500;
  letter-spacing: -0.25px; line-height: 1; color: #fff; white-space: pre; opacity: 0;
}
.dca .pill__t.is-in { opacity: 1; }
.dca .pill__x.is-in { opacity: 1; transition: opacity 300ms ease-out; }

.dca .drop-clone {
  position: absolute; z-index: 40; white-space: pre; pointer-events: none;
  font-size: var(--dca-value-size, 34px); font-weight: var(--dca-value-weight, 400); line-height: 1; letter-spacing: var(--dca-value-track, -0.85px); color: var(--dca-ink, #000);
  transition: opacity 308ms ease-out;
}

/* lets the pointer through to the buttons below until "Finish setup" itself is in
   (it turns its own pointer-events on), so the custom cursor sees those buttons */
.dca .finish-wrap { position: absolute; z-index: 2; left: 20px; right: 20px; bottom: 44px; pointer-events: none; }
.dca .footnote {
  margin-bottom: 26px; font-size: var(--dca-footnote-size, 13px); font-weight: 400; line-height: 1.46;
  letter-spacing: -0.1px; color: #252525; opacity: 0;
}
.dca .footnote b { font-weight: 600; }
.dca .footnote.is-in { opacity: 1; transition: opacity 460ms ease-out; }
.dca .btn--finish {
  display: block; width: 100%; border: none; padding: 17.5px 8px; border-radius: var(--dca-button-radius, 999px);
  background: var(--dca-accent, #3236ff); font: inherit; font-size: var(--dca-finish-size, var(--dca-button-size, 14px)); font-weight: 500; letter-spacing: -0.1px;
  color: #fff; cursor: pointer; opacity: 0; transform: translateY(14px); pointer-events: none;
}
.dca .btn--finish.is-in {
  opacity: 1; transform: translateY(0); pointer-events: auto;
  transition: opacity 560ms ease-out, transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
}

.dca .wipe {
  position: absolute; left: 0; right: 0; bottom: -560px; height: calc(100% + 1120px);
  background: linear-gradient(to top, rgba(19,23,218,0) 0%, #1317da 560px,
                              #1317da calc(100% - 560px), rgba(19,23,218,0) 100%);
  transform: translateY(100%); z-index: 25; pointer-events: none;
}
.dca .wipe.is-up { transform: translateY(0); }
.dca .wipe.is-out { transform: translateY(-100%); }
`

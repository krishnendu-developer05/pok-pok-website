/** @type {import('tailwindcss').Config} */
module.exports = {
    "content": [
        "./*.{html,js}",
        "./!(build|dist|.*)/**/*.{html,js}"
    ],
    "theme": {
        "extend": {
            "colors": {
                "whitesmoke": "#f9f9f9",
                "brown": "#a42d42",
                "gray": {
                    "100": "rgba(255, 255, 255, 0.7)",
                    "200": "rgba(0, 0, 0, 0)"
                },
                "gainsboro": {
                    "100": "#d9d9d9",
                    "200": "rgba(217, 217, 217, 0.2)"
                },
                "white": "#fff",
                "black": "#000"
            },
            "spacing": {
                "num-65": "65px",
                "num-78": "78px"
            },
            "fontFamily": {
                "yeseva-one": "Yeseva One",
                "bebas-neue": "Bebas Neue",
                "inter": "Inter"
            },
            "borderRadius": {
                "num-19_54": "19.54px"
            }
        },
        "fontSize": {
            "num-14": "0.875rem"
        }
    },
    "corePlugins": {
        "preflight": false
    }
}
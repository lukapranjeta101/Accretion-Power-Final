/*
Template Name: Fabrica - Manufacturing Services Website TailwindCSS 4 Template
Version: 1.0.0
Author: Mostafa Akajdid
Website: https://akajdidm.vercel.app/
Email: mostafaakajdid6@gmail.com
File: App js
*/

// Preline Plugin File Import
import { HSStaticMethods } from "preline";


import './components/gallary';
import './components/animation';
import './components/video-play';
import './components/swiper';
import './components/contact-enquiry';

// Preline components (dropdowns, the mobile menu overlay, accordions, etc.)
// are only defined by the import above; they must be explicitly initialized.
document.addEventListener("DOMContentLoaded", () => {
    HSStaticMethods.autoInit()
})

var stickyNav = document.querySelector(".nav-sticky")

if (stickyNav) {
    window.addEventListener("scroll", function () {
        var scTop = window.pageYOffset || document.documentElement.scrollTop

        if (scTop >= 100) {
            stickyNav.classList.add("nav-sticky-on")
        } else {
            stickyNav.classList.remove("nav-sticky-on")
        }
    })
}


document.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname.replace(/\/$/, "")

    document.querySelectorAll("#navbar a[href]").forEach((link) => {
        const href = link.getAttribute("href")?.replace(/\/$/, "")
        if (!href) return

        if (currentPath === href || currentPath.endsWith(href) || document.body.dataset.navSection === href) {
            link.classList.add("active")
            link.setAttribute("aria-current", "page")
        }
    })
})


document.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname.replace(/\/$/, "")

    document.querySelectorAll("#mobile-menu a[href]").forEach((link) => {
        const href = link.getAttribute("href")?.replace(/\/$/, "")
        if (!href) return

        if (currentPath === href || currentPath.endsWith(href) || document.body.dataset.navSection === href) {
            link.classList.add("active")
            link.setAttribute("aria-current", "page")
        }
    })
})

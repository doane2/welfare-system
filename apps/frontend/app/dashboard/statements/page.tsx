'use client'
import { useState, useEffect } from 'react'
import { useAuth }             from '../../../lib/auth'
import { getStatementData }    from '../../../lib/api'
import toast                   from 'react-hot-toast'

// ─── Year range: 2026 is the fixed earliest year, auto-expands every January ──
const START_YEAR   = 2026
const CY           = new Date().getFullYear()
const EFFECTIVE_CY = Math.max(CY, START_YEAR)
const YEARS        = Array.from({ length: EFFECTIVE_CY - START_YEAR + 1 }, (_, i) => START_YEAR + i)

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// ─── Logo: raw JPEG base64 (no data: prefix) for jsPDF addImage() ─────────────
// For <img> tags we assemble LOGO_DATA_URI below — this avoids Next.js treating
// the raw base64 string as a page route (which caused the 404 errors).
const LOGO_BASE64 = `/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAC0ALQDASIAAhEBAxEB/8QAHAABAAMBAQEBAQAAAAAAAAAAAAUHCAYEAwIB/8QARhAAAQMDAgIECQkGBQQDAAAAAQIDBAAFEQYhBxIIEzFBFyI2UVV1k7PTFDI3VmGBg6TSFSNCcZGhFiQlM7FDYrLBctHx/8QAHAEAAwADAQEBAAAAAAAAAAAAAAUGAgMEBwEI/8QAQBEAAQIDAwYJCgYDAQEAAAAAAQACAwQRBSExBhJBUWFxEzVygZGhwdHwFBUWNDZSU3Ox0gciMkKS4SNi8UPC/9oADAMBAAIRAxEAPwDGVf1IKlBKQSScADvokFSglIJJOAB313egNIXG+Xdm02lgPzHhlxw7IaQMZUo9yRt9pOAASQKyAaGl7zRovJOhYkmoa0VJwXOQ7N2LlL+3kT/7P/1/WrF07wj1fcg2qPplcRoPBsuzQGS32HmKV+OUjOcgHsIGSMVdlk09ovhHZF3O8TGJdzPO43IcbSH3MeLyMNkkjZYBwf4sqITjHGan49XSR1jOnrSxCbPWJD8lXWuEHZCwkYSlQ7cHnGcdoG6JltTs+4tsiACwXcI+4HcLj9doC7nSUGAKzkSh90Y+PFV4fANq/wBJWL27vw6eAbV/pKxe3d+HUF4XeIf1h/Jsfop4XeIf1h/Jsforf5PlT8WF1/atXCWV7r+rvU74BtX+krF7d34dPANq/wBJWL27vw6gvC7xD+sP5Nj9FPC7xD+sP5Nj9FHk+VPxYXX9qOEsr3X9Xep3wDav9JWL27vw6eAbV/pKxe3d+HUF4XeIf1h/Jsfop4XeIf1h/Jsfoo8nyp+LC6/tRwlle6/q71O+AbV/pKxe3d+HTwDav9JWL27vw6gvC7xD+sP5Nj9FPC7xD+sP5Nj9FHk+VPxYXX9qOEsr3X9Xep3wDav9JWL27vw6eAbV/pKxe3d+HUF4XeIf1h/Jsfop4XeIf1h/Jsfoo8nyp+LC6/tRwlle6/q71O+AbV/pKxe3d+HTwDav9JWL27vw6gvC7xD+sP5Nj9FPC7xD+sP5Nj9FHk+VPxYXX9qOEsr3X9Xep3wDav8ASVi9u78OngG1f6SsXt3fh1BeF3iH9YfybH6KeF3iH9YfybH6KPJ8qfiwuv7UcJZXuv6u9Slz4FayZguOIXaJ6hjEdp9XMvcdnOhKdu3cjs8+1V/qvQd3sS1JvdilQAFJbD4R+6KiOYBK05Qo4z2E9h823Z2/jJr6NLQ+9dGJrac5YfiNhC8gjcoCVbduxHZ5tqsXSPGqy3xaLRqm1twBJQllbxWHIqypJC+sCgChBOBvzDCvGIAJrXEmcoZIZ8xBZGYLzm1BHTSvM071m2HZ8c0hvcw7cPHOsqXC3PRE8+Q43nHMB2fzFeKtRcUOETMmO/qfRKm3mXUJf/Z7CQpK0kElbCgcEEYIQB5+U/NTWcb1ASz/AJhkYQThSQPmnz/ypjJTstaUHh5Y4Yg4tOo+KLnjQYss/MijcdBUXSlK3rFTOno3zpSx/wBqMj+p/wDX9a1jpO1WvhHw5k3i5rzc5LSFyG3HMdY+Ektx0cvMNiVDmGf4lHxRgUnwEswuWv7DHU1IDUZXyt0tj/bLY5wVZBwkuBKT/wDLAwSK7npRX35Re7bp5l3LcRoyHwh7ILi9kpUgdikpTkE74d7gd0ltMdPzsCyGmjCM+JTSBgOkdYOhdck4QIMScP6hc3f47VWGrNQ3TVF7eu93f619zZKU7IaQOxCB3JGf7knJJJiaUq2hQmQWCHDFGi4AaEke9z3FzjUlKUpWaxSlK91is90vlwRAtEB+bJVjxGkZ5QSBzKPYlOSMqOAM7msXvbDaXPNANJWTWlxoBevDX3t8KZcJaIcCI/LkuZ5GWGytasAk4SNzsCfuq+9FcCrdF5ZOq5n7Qd3/AMrGUpDI+cN17LVtynbkwQR4wq27XbLbao6o9rt8SCypfOpuMyltJVgDJCQBnAG/2CoS08v5OXJZKtMQ68G956BsKeytgRogzopzR0lZRtfDLXlyjqfj6bloQlfIRJUiOrOAdkuFJI37cY7fMa9fgi4h/V784x+utXUqad+Ilok/lhspud9wTIZOy9L3O6u5Y3vGiNXWlchM/TlyQiOjnddQwXGkp5eYnrE5TgDtOdt89lc/W6K5vVmhtL6nae/alpYMl3cy2Uht8KCeUHnG6sDsCsp2GQcUzkfxFqQJuDdraew965o+Tt1YT+nv/pY7pVp8QODF6saHJ9hW5eYQWB1KGyZSAVHHijIWAOXKk4OSTygAmqsr0Gz7TlbRhcLLPDh1jeMQp+Ylosu7NiChSlKV3LnSlKUIVp8CuIb1gubOnrvLbFkkLIQ48ogRHDkgg9yFHYg4AJ5sjxs/fpF6HYs1xTqWAFmJdH1iW2sght9WVZGTkhfjnGMApO+CAKlrTEOR/jzo+vIUp+RMTb1NuIad655ciPunm2JKllCFEYzhfbuDUPbULzPaMG0oNzYhzIg0GuDt+J3gazV7JO8slnyz7y0VbzaFjyfHMaUto5wDlJPeO6ldHJhxpCwt5vmUBgHmI2+6lU7pN1Tmm5LBHFL1b/Rd8v53qpz3rVQXHz6Wb1+B7hup3ou+X871U571qoLj59LN6/A9w3U9L+1MX5Xa1d8TipvL7CuFpSlWSTJSlfe3Q5FwuEaBDb62TJdSyyjmA5lqICRk7Dcjtr45waCSaAL6ASaBTvD3Rt01nexAgDqmG8KlSlJyhhB7z51HBwnvx3AEjU+jNJWLSNvVDssTqus5S+8tRU48pIwCpR+84GEgk4Aya8nDXR8HRunGoLDTZmuoSudIB5i67jfBIB5ASQkYGBv2kk9RXh2VGUsW1I5hQnEQRgNe0678NQ21VzZdmtlWBzx+c9WwdqUpSpFNkpSlCEpSlCEqq+LXCeDf48m76eYbi3srLziArlblkgZBBOELOMhQwCSebt5halK77OtKZs6OI0u6hHQRqI0jxitExLQ5lhZEFR4wWGpDL0aQ5HkNOMvNLKHG3ElKkKBwQQdwQe6vxV4dIvQbLCDrG0Rm2kFf+qJSsJBUpQCXQnzknCsHclJx841R9e+2PasK1ZRsxD03EajpHdsoVATkq+VimG7/AKEpSlNFypWkei75ATvWrnumqzdWkei75ATvWrnumqjcu+KDympzYPrY3FZupSlWSTK1+i75fzvVTnvWqguPn0s3r8D3DdTvRd8v53qpz3rVQXHz6Wb1+B7huo2X9qYvyu1qcxOKm8vsK4WlKVZJMlXL0Y9L/KrtK1XJT+6hZjxd+15SfHVsf4UKxggg9ZtumqarXPBu0M2fhtZmWurUuTHTLdWlsIK1O+Pv5yAUpye0JHZ2COy4tF0pZhhsNDEObzae7nTmw5cRpnOODb+fR3rr6UqP1FeINhssm73J3q40ZHMsjtPcEgd5JwB/OvE4cN0RwYwVJuAVs5waCTgFIUrMF/4h6z11f2rTZn3oDMl3q48WK4UE571rG523PYPsrvrZwKtyo6Xb1qC5vziMrXHUlKQfs5gon+e33VVTWTMKzobTaEwGOdg0NLjz3geLqpVCtN0w4iXh5wGkmnerhpWetcWzXHC5bFws2pp0y0OL5AHjzhtXclSFZTuAcKGOzu2zc+nr4X9BQtR3QoRzW5MuSUDCR4nMrA/rS60LFMtBhzEGIIjHmgIqDXUQcF0S87wj3Q3tLXNvNe9T1KzdbLtqfi5rZdsVeHrVbEtqeLDKiEoaSQMYBHOolQ3PnPdtXcHgXYEN80a/XtmTjZzrEEZ8+AkH+9ds1k/LSBbDnpnMiEVoGl1K6zUdVVphWhFmAXQIdW6yaV5lbNKoGwjWujOLFp0xP1BMmW+U4CgrcK23WjnsCs8pyNwOz+9X9Sy1rL83uZmxA9rxnAiuGGldUpNeUB1WlpBoQV8LjDj3C3yYExvrY0lpTLyOYjmQoEKGRuNieysaawscjTepp9jlK53IjpSF4A6xBGULwCccySk4ztnB3raVZ56UloZjajtd5a6tK50dbTqEtgEqaI8cq/iJDiU79gQN/NT5AWi6DPGVJ/LEHWL/AKV6krt+XD4AijFv0P8AdFTtKUr2NRqVpHou+QE71q57pqs3VpHou+QE71q57pqo3Lvig8pqc2D62NxWbqUpVkkytfou+X871U571qoLj59LN6/A9w3U70XfL+d6qc961UFx8+lm9fge4bqNl/amL8rtanMTipvL7CuFpSlWSTJW5I7LMaO3HjtNsstICG220hKUJAwAANgAO6sN1uivMPxIJpLDl/8AyqjJv/05u1KpbpUXJ1q02W1IUQ3IececA7+QJCf/ADP9KumqV6VFtddtNluqEktx3nGHCO7nCSn/AMD/AFqTyQzPPMDPwqenNNOtNrXzvI35uz6hcl0ZobcjiE7IcSCYsBxxB8yipKP+FKrS9Zo6M0xuPxCejuKAMqA42gedQUlf/CVVpeu/L3O87HOwzRTdf21XPYNPJLtZUVqywwdTWCTZbiXRHkBPMpogLSQoKBBIIByPNXjuWnko4dytL29bigLYuHHU6ocx/dlKeYgAebOwr36jvtq07bFXK8yxFipUEFZQpW57BhIJP9KW++Wufp8X6LJK7cWlPB4tLT4ic5PKQFdx7t6m4T5xkFjmg8GHVFxpnd9Bgmb2wXPINM6l+uncshaevN60fqH5bBUqJOjlTTjbqPuUhST/AC/tVtWTj8oJSi9afBP8TsR7H9EK/VVgStP6D4j21F5ERmah3KUTGkrZdyk4IPYTjH8Qri79wDtriFrsd7kx3O1LctAcST5uZOCB9xr0OPbdg2q4NtOCWRBcag3HVUX3bRcp2HIz8qKyrw5pv0dt3QV2mlNX6H1vPYeipjLusYFTLcyOkSGvOUE5+/lNdrWLZke66S1Sthavk9ytsgEKQrICknIIPeDsf5GtmQXvlMJiRy8vWtpXjzZGam8qrChWYYUSXeXQ3g0qa0wNx1GtQmVlTzpkObEbRzcfHMvtVSdKRllWiLdIU02XkXJKEOFI5kpU04VAHtAJSnI7+UearbqqOlF5AQfWrfunaX5Lki14FPe7F0Wp6pE3LN1KUr9Arz5K0j0XfICd61c901Wbq0j0XfICd61c901Ubl3xQeU1ObB9bG4rN1KUqySZWv0XfL+d6qc961UFx8+lm9fge4bqd6Lvl/O9VOe9aqC4+fSzevwPcN1Gy/tTF+V2tTmJxU3l9hXC0pSrJJkrYHCeezcuG1gkMJcShEJEchYAPM1+7UdidsoOPsx2dlY/q8Oi/qVlpc/SkgtoW8szIqjgFauUJcRudzhKVAAdgWSdhUXl3IOmrN4VmMM15sD38yd2FMCFM5p/cKc6vio/UVng3+yyrRcmusjSUcqwNiO8KB7iDgj+VSFK8WhxHQ3B7DQi8FWjmhwIOBWX79w91noTUDV2s7D09mM71keVFbKyAO5aBuNtj2j7a7+2cdramOlu86fubE0DCkR0pWkn7OYpI/lv99XDSqqaymhWjDaLQlw9zbg4OLTz3EeLqJVCsx0u4mXiZoOgivcqIvTerOL92hxxapNk01Gc51OvggrPYVbgcysZAA2GTk1b9xtaGNGyrNbGAEot640doED/AKZSkZP3b1MUpXO2w6YEOHDYGQ4f6Wipv0knEk611QJMQ85zjnOdie7Us3aA1DrHhmt+Bd9M3F61ur51IU0pPIvGCpC8FJyAMj7BuK7Z7jvYSyUxLFeXpWNmlpQlJPmyFE/2q26Uwm7dkJ6Lw8zKVecS15aDvFD9VzwpGPAbmQ4120A9qzRYdE6o4h60ev16tztut8l/rZDjiCjKO5DYO52AGewdp81aWQlKEhCQEpSMADuFf2lcFs23FtRzA5oaxgo1owA8AdC3yUiyVBoal15KVQHSqnsuXix2tKXOujx3ZC1EDlKXFJSkDfOctKzt3j7r7kPMxo7kiQ62yy0grcccUEpQkDJJJ2AA76xxr+/f4n1jcr4G+qbku/uklOCG0gIRzDJ8blSM4OM5xtVBkDIOj2iZn9sMHpNwHRVcFvzAZL8HpceoX9ygqUpXsyi0rSPRd8gJ3rVz3TVZurSPRd8gJ3rVz3TVRuXfFB5TU5sH1sbis3UpSrJJla/Rd8v53qpz3rVQXHz6Wb1+B7hup3ou+X871U571qoLj59LN6/A9w3UbL+1MX5Xa1OYnFTeX2FcLSlKskmSvdp+6zLHe4d3gL5JMR0OIySArHalWCCUkZBGdwSK8NKxexsRpY4VBuKya4tIIxC2dorUUHVOnIt4gONkOoAeaSvmLDuBzNnYHIJ7cDIwRsRU1WSuE+upGiL2t0s/KLbL5UzGUgc5Cc8q0E/xJ5jsdjkg42I1NYrxa75b0T7RPYmxlY8dpeeUkA8qh2pVgjKTgjO4rwjKXJ6LZEwS0Ewj+k9h2jrF+ul3Zlotm4d5/MMR2r30pSphM0pSlCEpSlCEpSuF4pcR7Xo63uMx3WJt6V4rUQLz1RIB53cHKU4IIGxVkY2yodUnJR52MIMBuc4+L9Q2rVGjMgML4hoAuX6ReuE2+2HSVsfbVLmI/wA8pDigthrYhG22VjOQT83ORhYNZ5r73GZIuFwkz5jnWyZLqnnl8oHMtRJUcDYbk9lfCvfrCseHZMo2Ay84uOs92gbNqgZ6cdNxjEOGgaglKUpwuJK0j0XfICd61c901Wbq0j0XfICd61c901Ubl3xQeU1ObB9bG4rN1KUqySZWv0XfL+d6qc961UFx8+lm9fge4bqd6Lvl/O9VOe9aqC4+fSzevwPcN1Gy/tTF+V2tTmJxU3l9hXC0pSrJJkpSlCEqd0Zq2+6RuCplll9V1nKH2VpCm3kpOQFJP3jIwoAnBGTUFStUeBDjwzDitDmnEG8LNj3Q3BzTQhaf0Vxj0vfuWPcl/sOYc+LJcBZV847O7AbAfOCdyAM1ZNYXqZ03qrUenFpVZbxLhoCyvqkr5mlKKeUktnKVHGNyD2DzCvPbT/D2DEJfJRM3/V145jiBvqqGVyhe0UjtrtHdh9Fs+lZjtfG/W8OOpqQbbcVlfMHZMblUBgeKOrKBjbPZnc79levw86v9G2L2DvxKmnZBWs00AaefvCZC3pQjT0LSNeC+3i12O3rn3eexCjJz47q8cxAJ5UjtUrAOEjJONhWY7xxf15cVyOS6twWXkcnUxWEJCBy4PKogrB7882QTtjauJuE2ZcJa5k+W/LkuY53n3CtasAAZUdzsAPupnI/h3MOIM1FDRqbed19AOtc0fKKGBSE0k7bvHUrp4gccVOIcgaOZcZIWB+0X0JJICjnkbIIwQE+MrfBI5QcEUlIeekyHJEh1x551ZW444oqUtROSSTuST31+KV6LZdjSdlw8yWZSuJxJ3nsw2KcmpyNNOzoh7kpSlNFypSlKEJWkei75ATvWrnumqzdWkei75ATvWrnumqjcu+KDympzYPrY3FZupSlWSTK1+i75fzvVTnvWqguPn0s3r8D3DdTvRd8v53qpz3rVQXHz6Wb1+B7huo2X9qYvyu1qcxOKm8vsK4WpLTkCPPnOCWt1EaOw5Id6rHOpKE55U52yTgZ7tzg4xUbXot02VbpiJcN4tPIzhQAOxGCCDsQQSCDsQcVXRmvdDIYaHQlLCA4F2CknrZBlwpN0t0j5FDZUhvqZrhcdU6oKISkoRhWQk7kJA7D5zJvaGlxLg3GuVyjwmXYj0lqS7GkJSrqxkjlU2F/fy4x2ZO1Qk2+XOZs8+hKQ4hxKGmUNJQpOeXlSgAJxzK2GNzmvQ9qq9vTGZbkiOXGS4UpENkIPWAJXzICOVXMBvkHNL3wZ64McAL9NdF15brxJ0aCt4fA/cPFb9OpSUvQF9jN29x7qUInPtsIWtDqEoU4kqRlSkBJBAJykqxjfBqPs1utC58xmdNTKS02CwI0gR0vqJAOHHk4GAScFO+Nq+Luo7s6Yy1uRetjLStp5MNkO5SMDKwnmUAO4kjYeYV5bVc5lseU7EUzlYwpLzCHkK7xlKwU5HnxtWTIM6YbhEeCdFLtOk0rhdd9b0F8EOBaDTpXRQbFZQmLFuLN2blzLm9BQtLiE9RydWAVtFBKjlzcBY7Nq8r2m22tKOz1POG4trU91QI5DFS51JWNs563bzYBrzsasvzKHAiY2VuPuSC8uM0p5Li8cykuFJWgnlHzSOyvwNVaiED9ni8ShB+TmP8l5/wBzyEYx1fzc755sZzvnO9ahAnwQQ4Ygm83ip2XXUHMsjEgEYHDV/akNN6bhXWBHlOPSEBwvMLCSNn+ZpLXd80qeRnvwlWCO70StBXQ2hdzhIWphiIl57nQs5UGkuuAKSjkSEhWMLUCSDjNc3Eu1wiQFwY8lTcdb6JCkBI/3EZ5TnGRjPZ2HbPYK9UjUt3kolplPR5AluLccL0RlZSpfzigqSS3n/s5ewV9iQJ/hS6G8Urp1V/6N1Ob42JAzaOaarppmlYD9vgMW5yGmdPeCcKRLddbCYzLhAS2hQOVLJOyj4yMYAViJj6Iuztyk25b0VmUxJRGDbnWBTri0lSQlIQTulJPjAY78Go5nUd4adacTKQotBQSlbDa0kKbQ2QUqSQoFLaBgg9me3Jr8O3+7uSflKphDvWtvcyW0p8dtPIg7DuTtjsPfWMKWtCG0tEQG7TffXdhS7esnRJdxrm/8p3r66k09N09dGIVzPVh5tLqXOqcR4hUU55HEpWMFKtiB2eYg1KXHTMF1xT9slCJbWypKps2Sl1pwhSQnBaQSlR5geQpykYJPm5+43KTOlolOiM06gAJMaM3HGxyDytpSM79uM1JDV9+BTiTG5EhQ6r5Ex1aiSklSkcnKpWUpPMQTsN62vhTpawhwzhjiBzChv33bFg10Crqg00eKr5yNOvw2XV3CZDiOtyFx0R1qWXHlIUEr5eVKkgA7ZUQDg4zUrcNA3eJDduToSxBQ/wAhWpLqw22XeqCysNhCt8bA82N+UVB/t66KivRnX230POqeUX2G3VhaiCpSVqSVIJIGeUjNfqbqC6TYq48t2O8FrK+sXEaLqSVc55XOXnSMknAIG52xQ6HPktIe0X37tl2O+u/QgOlwDUHZv2r2XfSz0KVKTHuMOZFjF8LkoDiUpLXLlKgpIIUStCR2glQ3xvXPVOXDUkqbapUV1AEibIQ9LeQEIS5yA8oCEJABJUSpWSVEJPdvB10ygmAykfH67dHZuGC1xuDr/jwStI9F3yAnetXPdNVm6tI9F3yAnetXPdNVL5d8UHlNTOwfWxuKzdSlKskmVndGOdFZ4hKQ47yqm25xqOOU+OrmQ5js28VCjvjs8+K8XSFhyI3FO4PPt8jctpl5g8wPOgNpQTt2eMhQ383mxXGcL9QqsV+tF7SpYEJ9IfDaApRa+atICtslBI7u3tFXx0jtOqvmnLfqm0NtyxDQS8thCVlyMsBQc5wclCSM4GRhwq2AJqJmYgksoYMw+5kZmbU6CDXro0c5TyG0x7OfDGLDXm8VWeaUpVskaUpShCUpShCUpShCUpShCUpShCUpShCUpShCUpShCVpHo7/6Nwqm3W5fuIapT8wOfO/coQlKlYTk7FtYxjO3ZuKzzZ7bOvFzj2y2RnJUuQvkaaR2k/8AAAGSSdgASdhWieKsqNobg2zpyJIbTKkR0QGi20hPWjA69woJ2ChzZIyQpwb5Oai8sXiZbAs1n6orxvDRidn9FO7HHBF8ycGg9OrxsWa6VFXS5uxpXUspbUAkc3MDsf8A8xSqx0zDaaFKRBcRVR9omCI+efPVrGFY7vMa0rwD14zJjq0TqeS28y6gM2/5QgKStJBCo6idiCMBII86c/NTWXalLXdOpSGZHMpA2SoblP2H7KRTsjBtKWMtHu0g6WnWPGFV3wYz5aKIrOcawrx4tcJ51gkSbvp5hyVZAgvOICuZyIARkEE5WgZyFDJAB5uzmNWVbXDTjRNs0UQNSplXiIVFTcsO88hsEE4PMf3gJxjKgQCdyMAd9KjcHdeZUiRaUzHnVtocbX8jkrecx43KeUuKyRgqSoZz27ilkK2rRsf/AA2lBMRowiMvqP8AYa99DsOJ6XSUtOfnlnhpP7Td0LM9K0j4BtIekr77dr4dPANpD0lffbtfDrd6d2Rrd/Fa/MM3qHSs3UrSPgG0h6Svvt2vh08A2kPSV99u18Oj07sjW7+KPMM3qHSs3UrSPgG0h6Svvt2vh08A2kPSV99u18Oj07sjW7+KPMM3qHSs3UrSPgG0h6Svvt2vh08A2kPSV99u18Oj07sjW7+KPMM3qHSs3UrSPgG0h6Svvt2vh08A2kPSV99u18Oj07sjW7+KPMM3qHSs3UrSPgG0h6Svvt2vh08A2kPSV99u18Oj07sjW7+KPMM3qHSs3V67PbZ14uce2WyM5KlyF8jTSO0n/gADJJOwAJOwrQ3gZ4f2b/UrrcJ6obP+4JsxDbO/ijmUlKSNyMeMN8dvZX7ncQOGmhYT0TTjESTKShDZatrQw7hBKCt/GFgZwVZWoFR2JzWL8sWzIzLNgPiu3UaN52c29ZCxzCvmXho338y/HDHQtr4e2R3VeqnmG7khoqccWeZEJB25E4+c4c4JGc55U5ySqj+LGupep729c5TjnyJpam7fGI5Q22TtkAkc5ABUcncY7AkBxN4hXXU89cq5yHGYXODGt7bhLbYGQDjYKXhRys7742GAK0nS3Jb3OvZI+akdiRW2zbNjS0V09PODph3Qwah46bycZmYZFYIEAUhjpJ1lfFxSlrUtRypRJJ+2lfmlMVoSlKUIX3iy34ystOEDO6TuD91dHbn1yIbbywkKVnIHZ2kUpXfJOJqFzRwF6KUpXeuZKUpQhKUpQhKUpQhKUpQhKUpQhKUpQhKirzPfjPBlnlSFICubGSNz93dSlaY5IYSFshirlCLWtaipalKUe0k5NfmlKTruSlKUIX//2Q==`

// Assembled data URI — ONLY used for <img> src in the React preview UI.
// Do NOT use as img src the raw LOGO_BASE64 string — Next.js would try to
// route the base64 string as a URL path, causing 404 errors.
const LOGO_DATA_URI = `data:image/jpeg;base64,${LOGO_BASE64}`

const css = `
  .stmt-page        { padding: 32px 36px; }
  .stmt-grid        { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; max-width: 960px; }
  .stmt-period-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 22px; }
  .stmt-includes    { background: #f8fafc; border-radius: 14px; padding: 20px; border: 1px solid #e2e8f0; }
  .stmt-rates-row   { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid #f1f5f9; }
  .stmt-preview     { background: #0a1934; border-radius: 16px; overflow: hidden; border: 1px solid #1e3a6e; box-shadow: 0 20px 60px rgba(10,25,52,0.4); }

  @media (max-width: 900px) {
    .stmt-page { padding: 24px; }
    .stmt-grid { grid-template-columns: 1fr; max-width: 100%; }
  }
  @media (max-width: 640px) {
    .stmt-page        { padding: 20px 16px; }
    .stmt-grid        { gap: 20px; }
    .stmt-period-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
    .stmt-preview     { display: none; }
  }
  @media (max-width: 400px) {
    .stmt-period-grid { grid-template-columns: 1fr; }
  }
  @keyframes spin { to { transform: rotate(360deg) } }
`

export default function StatementsPage() {
  const { user } = useAuth()

  const [fromMonth,  setFromMonth]  = useState('January')
  const [fromYear,   setFromYear]   = useState(START_YEAR)
  const [toMonth,    setToMonth]    = useState(MONTHS[new Date().getMonth()])
  const [toYear,     setToYear]     = useState(EFFECTIVE_CY)
  const [loading,    setLoading]    = useState(false)
  const [memberRate, setMemberRate] = useState<{ monthly: number; annual: number; type: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { default: api } = await import('../../../lib/api')
        const { data } = await api.get('/dashboard/me')
        const monthly = data.member?.monthlyRate || (data.member?.memberType === 'FAMILY' ? 500 : 200)
        setMemberRate({ monthly, annual: monthly * 12, type: data.member?.memberType || 'SINGLE' })
      } catch {}
    }
    load()
  }, [])

  const generatePDF = async () => {
    setLoading(true)
    try {
      const { data } = await getStatementData({
        fromPeriod: `${fromMonth} ${fromYear}`,
        toPeriod:   `${toMonth} ${toYear}`,
      })

      const { jsPDF } = await import('jspdf')
      const autoTable  = (await import('jspdf-autotable')).default
      const doc        = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW      = doc.internal.pageSize.getWidth()
      const pageH      = doc.internal.pageSize.getHeight()
      const now        = new Date()
      const margin     = 14

      const member   = data.member        || {}
      const summary  = data.summary       || {}
      const contribs = data.contributions || []
      const loans    = data.loans         || []

      const totalPaid     = Number(summary.totalPaid     || 0)
      const annualPaid    = Number(summary.annualPaid    || 0)
      const expectedTotal = Number(summary.expectedTotal || 0)
      const arrears       = Number(summary.arrears       || 0)
      const standing      = summary.standing || 'GOOD'
      const monthlyRate   = Number(member.monthlyRate || 200)
      const annualRate    = Number(member.annualRate   || monthlyRate * 12)

      const standingRGB: [number,number,number] =
        standing === 'GOOD' ? [21,128,61] : standing === 'WARNING' ? [180,83,9] : [220,38,38]

      // ── HEADER ─────────────────────────────────────────────────────────────
      doc.setFillColor(10, 25, 52)
      doc.rect(0, 0, pageW, 52, 'F')
      // Left gold bar
      doc.setFillColor(230, 176, 32)
      doc.rect(0, 0, 4, 52, 'F')
      // Official logo — jsPDF addImage accepts raw base64 without data: prefix
      doc.addImage(LOGO_BASE64, 'JPEG', 8, 5, 22, 22)
      // Org name
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('CRATER SDA WELFARE SOCIETY', 35, 16)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(180, 200, 230)
      doc.text('Nakuru, Kenya  ·  Est. 2016  ·  Member Welfare Contributions', 35, 23)
      doc.setDrawColor(230, 176, 32)
      doc.setLineWidth(0.4)
      doc.line(35, 27, pageW - margin, 27)
      doc.setTextColor(245, 200, 66)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('OFFICIAL CONTRIBUTION STATEMENT', 35, 34)
      doc.setTextColor(160, 185, 215)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Generated: ${now.toLocaleDateString('en-KE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}`,
        35, 41
      )
      // Period badge
      doc.setFillColor(230, 176, 32)
      doc.roundedRect(pageW - 72, 8, 58, 16, 3, 3, 'F')
      doc.setTextColor(10, 25, 52)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text('PERIOD', pageW - 43, 16, { align: 'center' })
      doc.setFontSize(7)
      doc.text(
        `${fromMonth.slice(0,3).toUpperCase()} ${fromYear} – ${toMonth.slice(0,3).toUpperCase()} ${toYear}`,
        pageW - 43, 22, { align: 'center' }
      )

      // ── MEMBER INFO ─────────────────────────────────────────────────────────
      let y = 58
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(margin, y, pageW - margin * 2, 50, 3, 3, 'F')
      doc.setDrawColor(210, 220, 235)
      doc.setLineWidth(0.25)
      doc.roundedRect(margin, y, pageW - margin * 2, 50, 3, 3, 'S')
      doc.setFillColor(30, 58, 110)
      doc.roundedRect(margin, y, pageW - margin * 2, 8, 3, 3, 'F')
      doc.rect(margin, y + 5, pageW - margin * 2, 3, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text('MEMBER INFORMATION', margin + 5, y + 5.5)

      const col1X = margin + 5
      const col2X = pageW / 2 + 4
      const rowH  = 5.8

      const drawRows = (rows: string[][], startX: number, startY: number) => {
        rows.forEach(([label, val], i) => {
          const ry = startY + i * rowH
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(120, 135, 155)
          doc.text(label + ':', startX, ry)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(15, 32, 64)
          doc.text(String(val), startX + 28, ry)
        })
      }

      drawRows([
        ['Full Name',   member.fullName    || '—'],
        ['Member No.',  member.memberNumber || '—'],
        ['National ID', member.nationalId   || '—'],
        ['Phone',       member.phone        || '—'],
        ['Email',       member.email        || '—'],
      ], col1X, y + 14)

      drawRows([
        ['Group',         member.group?.name || '—'],
        ['Member Type',   member.memberType  || 'SINGLE'],
        ['Monthly Rate',  `KES ${monthlyRate.toLocaleString()}/month`],
        ['Annual Rate',   `KES ${annualRate.toLocaleString()}/year`],
        ['Ann. Deadline', '31 March each year'],
      ], col2X, y + 14)

      doc.setDrawColor(210, 220, 235)
      doc.setLineWidth(0.25)
      doc.line(pageW / 2, y + 10, pageW / 2, y + 49)

      // ── FINANCIAL SUMMARY ───────────────────────────────────────────────────
      y += 55
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 58, 110)
      doc.text('FINANCIAL SUMMARY', margin, y)
      doc.setDrawColor(230, 176, 32)
      doc.setLineWidth(0.5)
      doc.line(margin, y + 1.5, margin + 42, y + 1.5)

      y += 5
      const kpis = [
        { label: 'Total Paid',        value: `KES ${totalPaid.toLocaleString()}`,     rgb: [21,128,61]  as [number,number,number], bg: [240,253,244] as [number,number,number] },
        { label: 'Paid This Year',    value: `KES ${annualPaid.toLocaleString()}`,    rgb: [30,58,110]  as [number,number,number], bg: [238,242,255] as [number,number,number] },
        { label: 'Annual Obligation', value: `KES ${expectedTotal.toLocaleString()}`, rgb: [30,58,110]  as [number,number,number], bg: [238,242,255] as [number,number,number] },
        { label: 'Arrears',           value: `KES ${arrears.toLocaleString()}`,       rgb: (arrears > 0 ? [180,83,9] : [21,128,61]) as [number,number,number], bg: (arrears > 0 ? [255,247,237] : [240,253,244]) as [number,number,number] },
        { label: 'Standing',          value: standing,                                rgb: standingRGB, bg: (standing === 'GOOD' ? [240,253,244] : standing === 'WARNING' ? [255,247,237] : [254,242,242]) as [number,number,number] },
      ]
      const kpiW = (pageW - margin * 2) / kpis.length
      const kpiH = 20

      kpis.forEach((k, i) => {
        const kx = margin + i * kpiW
        doc.setFillColor(k.bg[0], k.bg[1], k.bg[2])
        doc.roundedRect(kx, y, kpiW - 1.5, kpiH, 2, 2, 'F')
        doc.setDrawColor(210, 220, 235)
        doc.setLineWidth(0.2)
        doc.roundedRect(kx, y, kpiW - 1.5, kpiH, 2, 2, 'S')
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(120, 135, 155)
        doc.text(k.label.toUpperCase(), kx + (kpiW - 1.5) / 2, y + 6, { align: 'center' })
        doc.setFontSize(k.value.length > 12 ? 7 : 9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(k.rgb[0], k.rgb[1], k.rgb[2])
        doc.text(k.value, kx + (kpiW - 1.5) / 2, y + 15, { align: 'center' })
      })

      // ── CONTRIBUTION LEDGER ─────────────────────────────────────────────────
      y += kpiH + 9
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 58, 110)
      doc.text('CONTRIBUTION LEDGER', margin, y)
      doc.setDrawColor(230, 176, 32)
      doc.setLineWidth(0.5)
      doc.line(margin, y + 1.5, margin + 46, y + 1.5)

      autoTable(doc, {
        startY: y + 5,
        head: [['Period','Type','Amount (KES)','M-Pesa Ref','Method','Date','Status']],
        body: contribs.length > 0
          ? contribs.map((c: any) => [
              c.period || '—', c.type || '—', Number(c.amount).toLocaleString(),
              c.payments?.[0]?.mpesaRef || '—', c.payments?.[0]?.method || '—',
              c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }) : '—',
              (c.status || '—').toLowerCase(),
            ])
          : [['No contributions in selected period','','','','','','']],
        theme: 'grid',
        headStyles:         { fillColor:[10,25,52], textColor:[255,255,255], fontSize:7.5, fontStyle:'bold', halign:'left', cellPadding:3.5 },
        bodyStyles:         { fontSize:7.5, textColor:[51,65,85], cellPadding:3 },
        alternateRowStyles: { fillColor:[248,250,252] },
        columnStyles:       { 0:{ fontStyle:'bold' }, 2:{ fontStyle:'bold', textColor:[15,32,64], halign:'right' }, 6:{ halign:'center' } },
        margin:             { left: margin, right: margin },
      })

      if (loans.length > 0) {
        const loanY = ((doc as any).lastAutoTable?.finalY || 200) + 10
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 58, 110)
        doc.text('LOAN HISTORY', margin, loanY)
        doc.setDrawColor(230, 176, 32)
        doc.setLineWidth(0.5)
        doc.line(margin, loanY + 1.5, margin + 30, loanY + 1.5)

        autoTable(doc, {
          startY: loanY + 5,
          head: [['Date','Principal (KES)','Interest','Total Due (KES)','Repaid (KES)','Remaining (KES)','Status']],
          body: loans.map((l: any) => {
            const totalDue = l.principal + l.principal * l.interestRate
            const repaid   = (l.repayments || []).reduce((s: number, r: any) => s + r.amount, 0)
            return [
              new Date(l.createdAt).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }),
              Number(l.principal).toLocaleString(), `${(l.interestRate * 100).toFixed(0)}%`,
              totalDue.toLocaleString(), repaid.toLocaleString(),
              Math.max(0, totalDue - repaid).toLocaleString(), l.status.toLowerCase(),
            ]
          }),
          theme: 'grid',
          headStyles:         { fillColor:[30,58,110], textColor:[255,255,255], fontSize:7.5, fontStyle:'bold', cellPadding:3.5 },
          bodyStyles:         { fontSize:7.5, textColor:[51,65,85], cellPadding:3 },
          alternateRowStyles: { fillColor:[248,250,252] },
          columnStyles:       { 1:{ halign:'right', fontStyle:'bold' }, 3:{ halign:'right', fontStyle:'bold' }, 4:{ halign:'right' }, 5:{ halign:'right' }, 6:{ halign:'center' } },
          margin:             { left: margin, right: margin },
        })
      }

      // ── PER-PAGE: CONFIDENTIAL watermark + footer with logo ─────────────────
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let pg = 1; pg <= totalPages; pg++) {
        doc.setPage(pg)

        // Diagonal CONFIDENTIAL watermark (text only, very light)
        doc.setFontSize(52)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(232, 235, 243)
        doc.text('CONFIDENTIAL', pageW / 2, pageH / 2, { align: 'center', angle: 45 })

        // Gold footer divider
        doc.setDrawColor(230, 176, 32)
        doc.setLineWidth(0.5)
        doc.line(margin, pageH - 18, pageW - margin, pageH - 18)

        // Footer row 1 — left: confidential note  |  right: page number
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(120, 135, 155)
        doc.text(
          'CONFIDENTIAL — This statement is computer-generated and does not require a signature.',
          margin, pageH - 13
        )
        doc.setFont('helvetica', 'normal')
        doc.text(`Page ${pg} / ${totalPages}`, pageW - margin - 14, pageH - 13, { align: 'right' })

        // Footer row 2 — left: org name
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 58, 110)
        doc.text('Crater SDA Welfare Society  ·  Nakuru, Kenya  ·  Est. 2016', margin, pageH - 7)

        // Footer row 2 — right: logo (12×12 mm, right-aligned)
        doc.addImage(LOGO_BASE64, 'JPEG', pageW - margin - 12, pageH - 19, 12, 12)
      }

      const filename = `CraterSDA_Statement_${member.memberNumber || 'Member'}_${fromYear}-${toYear}.pdf`
      doc.save(filename)
      toast.success('Statement downloaded!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate statement. Please try again.')
    } finally { setLoading(false) }
  }

  const monthlyRate = memberRate?.monthly || 200
  const annualRate  = memberRate?.annual  || monthlyRate * 12
  const memberType  = memberRate?.type    || 'SINGLE'

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 9,
    border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.15s',
  }

  return (
    <div className="stmt-page">
      <style>{css}</style>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 700, color: '#0f2040', marginBottom: 4 }}>Statements</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Download your official corporate PDF contribution statement</p>
      </div>

      <div className="stmt-grid">

        {/* ── Left panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f2040', marginBottom: 20 }}>Select period</div>

            <div className="stmt-period-grid">
              {[
                { label: 'FROM — Month', value: fromMonth, set: setFromMonth,                       options: MONTHS },
                { label: 'FROM — Year',  value: fromYear,  set: (v: any) => setFromYear(Number(v)), options: YEARS  },
                { label: 'TO — Month',   value: toMonth,   set: setToMonth,                         options: MONTHS },
                { label: 'TO — Year',    value: toYear,    set: (v: any) => setToYear(Number(v)),   options: YEARS  },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                    {f.label}
                  </label>
                  <select
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    style={selectStyle}
                    onFocus={e => (e.target.style.borderColor = '#1e3a6e')}
                    onBlur={e  => (e.target.style.borderColor = '#e2e8f0')}
                  >
                    {f.options.map((o: any) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <button
              onClick={generatePDF}
              disabled={loading}
              style={{
                width: '100%', background: loading ? '#94a3b8' : '#0f2040',
                color: '#fff', padding: 15, borderRadius: 10, fontSize: 15, fontWeight: 700,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              {loading
                ? <><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} /> Generating...</>
                : <>📄 Download PDF Statement</>
              }
            </button>
          </div>

          {/* What's included */}
          <div className="stmt-includes">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>PDF includes</div>
            {[
              { icon: '🏢', text: 'Official header — logo + gold accent'              },
              { icon: '👤', text: 'Full member details — name, ID, phone, group'       },
              { icon: '💰', text: 'Financial summary — paid, obligation, arrears'       },
              { icon: '📋', text: 'Contribution ledger with M-Pesa references'         },
              { icon: '🏦', text: 'Loan history with repayment breakdown'              },
              { icon: '✅', text: 'Welfare standing indicator'                         },
              { icon: '🔒', text: 'CONFIDENTIAL watermark + logo in footer every page' },
            ].map(item => (
              <div key={item.text} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', fontSize:13, color:'#475569', borderBottom:'1px solid #f1f5f9' }}>
                <span>{item.icon}</span><span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel: preview ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="stmt-preview">

            {/* Preview header — uses LOGO_DATA_URI so Next.js doesn't try to route it */}
            <div style={{ background:'#0a1934', padding:'14px 18px', borderLeft:'4px solid #e6b020', borderBottom:'2px solid #e6b020', display:'flex', alignItems:'center', gap:12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_DATA_URI}
                alt="Crater SDA Welfare Society logo"
                style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, objectFit:'cover', border:'2px solid #e6b020' }}
              />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:10, fontWeight:800, color:'#fff', letterSpacing:'0.04em' }}>CRATER SDA WELFARE SOCIETY</div>
                <div style={{ fontSize:8, color:'rgba(255,255,255,0.4)', marginTop:1 }}>Official Contribution Statement</div>
              </div>
              <div style={{ background:'#e6b020', borderRadius:4, padding:'3px 8px', fontSize:8, fontWeight:700, color:'#0a1934', whiteSpace:'nowrap', flexShrink:0 }}>
                {fromMonth.slice(0,3)} {fromYear}–{toMonth.slice(0,3)} {toYear}
              </div>
            </div>

            <div style={{ padding:'16px 18px' }}>
              {[
                { label:'Member', value: user?.fullName     || '—' },
                { label:'No.',    value: user?.memberNumber || '—' },
                { label:'Type',   value: memberType === 'FAMILY' ? 'Family Member' : 'Single Member' },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.06)', fontSize:11 }}>
                  <span style={{ color:'rgba(255,255,255,0.4)' }}>{r.label}</span>
                  <span style={{ color:'#fff', fontWeight:500 }}>{r.value}</span>
                </div>
              ))}

              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginTop:12, marginBottom:14 }}>
                {[
                  { label:'Monthly', value:`KES ${monthlyRate.toLocaleString()}`, color:'#e6b020' },
                  { label:'Annual',  value:`KES ${annualRate.toLocaleString()}`,  color:'#6ee7b7' },
                  { label:'Status',  value:'Good Standing',                        color:'#6ee7b7' },
                ].map(k => (
                  <div key={k.label} style={{ background:'rgba(255,255,255,0.05)', borderRadius:6, padding:'8px 10px', border:'1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize:8, color:'rgba(255,255,255,0.35)', marginBottom:3 }}>{k.label}</div>
                    <div style={{ fontSize:10, fontWeight:700, color:k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>

              {/* Sample ledger */}
              <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:6, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ background:'#1e3a6e', padding:'5px 8px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4 }}>
                  {['Period','Amount','Status'].map(h => (
                    <div key={h} style={{ fontSize:7, fontWeight:700, color:'rgba(255,255,255,0.7)', textTransform:'uppercase' }}>{h}</div>
                  ))}
                </div>
                {[
                  ['Jan 2026','KES 200','approved',true ],
                  ['Feb 2026','KES 200','approved',true ],
                  ['Mar 2026','KES 200','pending', false],
                ].map((row, i) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4, padding:'5px 8px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize:9, color:'rgba(255,255,255,0.6)' }}>{row[0]}</div>
                    <div style={{ fontSize:9, fontWeight:600, color:'#fff' }}>{row[1]}</div>
                    <div style={{ fontSize:8, color: row[3] ? '#6ee7b7' : '#fbbf24' }}>{row[2] as string}</div>
                  </div>
                ))}
              </div>

              {/* Footer preview hint */}
              <div style={{ marginTop:12, padding:'6px 10px', background:'rgba(230,176,32,0.07)', borderRadius:6, border:'1px solid rgba(230,176,32,0.15)', display:'flex', alignItems:'center', gap:8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={LOGO_DATA_URI} alt="" style={{ width:14, height:14, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                <span style={{ fontSize:8, color:'rgba(230,176,32,0.7)', fontWeight:700, letterSpacing:'0.06em' }}>
                  CONFIDENTIAL WATERMARK + LOGO FOOTER · EVERY PAGE
                </span>
              </div>
            </div>
          </div>

          {/* Rates card */}
          <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#0f2040', marginBottom:12 }}>Contribution rates</div>
            {[
              { icon:'👤',    type:'Single member', rate:'KES 200/month', annual:'KES 2,400/year', active: memberType === 'SINGLE' },
              { icon:'👨‍👩‍👧', type:'Family member', rate:'KES 500/month', annual:'KES 6,000/year', active: memberType === 'FAMILY' },
            ].map(r => (
              <div key={r.type} className="stmt-rates-row">
                <span>{r.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight: r.active ? 600 : 400, color: r.active ? '#0f2040' : '#64748b' }}>{r.type}</div>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>{r.rate} · {r.annual}</div>
                </div>
                {r.active && <span style={{ fontSize:10, background:'#eef2ff', color:'#1e3a6e', padding:'2px 8px', borderRadius:99, fontWeight:700 }}>Your plan</span>}
              </div>
            ))}
            <div style={{ fontSize:11, color:'#94a3b8', marginTop:10, padding:'8px 10px', background:'#f8fafc', borderRadius:8 }}>
              📅 Full annual payment due by <strong style={{ color:'#0f2040' }}>31 March</strong> each year
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

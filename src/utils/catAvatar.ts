// Client-side utility functions for generating random cat avatars
// These functions are safe to use in client components

// Generate a completely random color in hex format
const generateRandomColor = () => {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Generate a random light color in hex format.
 * The color will be in the lighter range by keeping RGB values high.
 */
const generateRandomLightColor = () => {
  const r = Math.floor(Math.random() * 100) + 155; // 155-255
  const g = Math.floor(Math.random() * 100) + 155; // 155-255
  const b = Math.floor(Math.random() * 100) + 155; // 155-255
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Generate random cat avatar with custom colors (client-safe version)
export const generateRandomCatAvatarClient = (
  hasBackground: boolean = true,
  includeBody: boolean = false
) => {
  const bgColor = generateRandomLightColor();
  const bodyColor = generateRandomColor();
  const mouthColor = generateRandomColor();
  const noseColor = generateRandomColor();
  const tongueColor = generateRandomColor();

  if (includeBody) {
    // Cat with body SVG template
    return `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_23868_11913)">
${hasBackground ? `<rect width="120" height="120" rx="60" fill="${bgColor}" style="fill:${bgColor};fill-opacity:1;"/>` : ''}
<path d="M39.5 71.5C37.9 82.3 59.8333 128.5 65.5 139.5C83.5 121.9 109 112.5 119.5 110C120.333 110.167 109.8 86.8 105 78C99 67 88 63 85 60C82 57 75.5 56.5 76.5 55C77.5 53.5 77.5 46 75.5 41.5C73.5 37 80.5 30 82 27.5C83.5 25 79.5 25.5 77.5 25.5C75.5 25.5 66.5 31.5 63 30C59.5 28.5 48 30 45.5 30C43.5 30 38.6667 24.6667 36.5 22C37.5 24.5 38.9 30.5 36.5 34.5C33.5001 39.5 30.5 48.5 34 56.5C37.5 64.5 41.5 58 39.5 71.5Z" fill="${bodyColor}" stroke="black" style="fill:${bodyColor};fill-opacity:1;stroke:black;stroke-opacity:1;" stroke-width="2"/>
<path d="M41.5001 51.9993C38.3001 45.5993 42.0001 42.4993 45.5001 41.4993C49.8536 40.2555 55.241 45.5957 57.5001 46.4993C60.0001 47.4993 63.0001 51.9993 60.0001 54.9993C57.0001 57.9993 56.0001 59.9993 54.5001 63.4993C53 66.9993 48.5001 67.4993 47.0001 63.4993C45.5001 59.4993 45.5001 59.9993 41.5001 51.9993Z" fill="${mouthColor}" stroke="black" style="fill:${mouthColor};fill-opacity:1;stroke:black;stroke-opacity:1;" stroke-width="2"/>
<path d="M37.9999 44.5C34.6666 42.1667 28.0999 36.4 28.4999 32M37.9999 44.5C35.8333 44.5 30.3 44.9 25.5 46.5M37.9999 44.5C34.4999 46.5 27.1 51 25.5 53M37.9999 47.5C35.3333 48.5 30 51.4 30 55M58 32C56.4 33.2 52.6667 38.8333 51 41.5C55.1667 37.3333 64.4 28.8 68 28M54 44.5C54.3333 43.3333 55.2 40.7 56 39.5" stroke="black" style="stroke:black;stroke-opacity:1;"/>
<path d="M45.0001 39.4997L45.5001 40.9997C46.1667 41.4998 47 41 47 41C47 41 48.1667 39.1667 49 39C49.5 38.6666 50.3 37.7997 49.5 36.9997C48.5 35.9997 44.5001 35.9997 44.0001 37.4997C43.6001 38.6997 44.5001 39.333 45.0001 39.4997Z" fill="${noseColor}" stroke="black" style="fill:${noseColor};fill-opacity:1;stroke:black;stroke-opacity:1;" stroke-width="2"/>
<path d="M55 36.5001C56.1667 36.0001 58.9 35.1001 60.5 35.5001M44.5 36C44 35.8333 42.7 35.5999 41.5 36M43 43L43.5 48L45 42L43 43ZM50 42.5V47L51.5 43.5L50 42.5Z" stroke="black" style="stroke:black;stroke-opacity:1;" stroke-width="2"/>
<path d="M46.7129 58.8332C46.3129 56.8332 48.5463 52.9998 49.7129 51.3332C50.213 50.5835 51.7129 51.3332 53.2129 51.3332C54.4129 51.3332 54.3796 51.6665 54.2129 51.8332L53.2129 52.8332C52.7129 53.3332 53.7129 58.8332 53.2129 60.8332C52.7129 62.8332 53.2129 62.8332 51.2129 63.3332C49.2129 63.8332 47.2129 63.3332 46.7129 63.3332C46.2129 63.3332 45.213 62.3332 45.0141 61.3332C44.855 60.5332 46.0804 60.9998 46.7129 61.3332C46.8796 61.3332 47.1129 60.8332 46.7129 58.8332Z" fill="${tongueColor}" stroke="black" style="fill:${tongueColor};fill-opacity:1;stroke:black;stroke-opacity:1;" stroke-width="2"/>
</g>
<defs>
<clipPath id="clip0_23868_11913">
<rect width="120" height="120" rx="60" fill="white" style="fill:white;fill-opacity:1;"/>
</clipPath>
</defs>
</svg>`;
  }

  // Original cat head only SVG
  return `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_23723_22255)">
${hasBackground ? `<rect width="120" height="120" rx="60" fill="${bgColor}" style="fill:${bgColor};fill-opacity:1;"/>` : ''}
<path d="M30.9157 98.5312C28.2215 116.756 65.1556 194.719 74.6979 213.281C105.009 183.581 147.949 167.719 165.63 163.5C167.033 163.781 149.296 124.35 141.213 109.5C131.11 90.9375 112.586 84.1875 107.535 79.125C102.483 74.0625 91.5372 73.2188 93.2212 70.6875C94.9051 68.1562 94.9051 55.5 91.5372 47.9062C88.1694 40.3125 99.9569 28.5 102.483 24.2812C105.009 20.0625 98.2729 20.9062 94.9051 20.9062C91.5372 20.9062 76.3819 31.0312 70.4881 28.5C64.5944 25.9688 45.2292 28.5 41.0194 28.5C37.6515 28.5 29.5125 19.5 25.864 15C27.5479 19.2188 29.9054 29.3438 25.864 36.0938C20.8123 44.5312 15.7604 59.7188 21.6542 73.2188C27.5479 86.7188 34.2836 75.75 30.9157 98.5312Z" fill="${bodyColor}" stroke="black" style="fill:${bodyColor};fill-opacity:1;stroke:black;stroke-opacity:1;" stroke-width="2"/>
<path d="M34.2836 65.6239C28.895 54.8239 35.1256 49.5926 41.0193 47.9051C48.3503 45.8061 57.4223 54.8178 61.2265 56.3426C65.4363 58.0301 70.4881 65.6239 65.4363 70.6864C60.3845 75.7489 58.7006 79.1239 56.1746 85.0301C53.6487 90.9364 46.0711 91.7801 43.5452 85.0301C41.0193 78.2801 41.0193 79.1239 34.2836 65.6239Z" fill="${mouthColor}" stroke="black" style="fill:${mouthColor};fill-opacity:1;stroke:black;stroke-opacity:1;" stroke-width="2"/>
<path d="M28.3898 52.9688C22.7767 49.0313 11.7189 39.3 12.3924 31.875M28.3898 52.9688C24.7413 52.9688 15.4237 53.6437 7.34082 56.3438M28.3898 52.9688C22.4961 56.3438 10.0351 63.9375 7.34082 67.3125M28.3898 58.0312C23.8993 59.7188 14.9185 64.6125 14.9185 70.6875M62.0685 31.875C59.3742 33.9 53.0876 43.4062 50.281 47.9062C57.2974 40.875 72.8457 26.475 78.9078 25.125M55.3328 52.9688C55.8941 51 57.3535 46.5563 58.7007 44.5312" stroke="black" style="stroke:black;stroke-opacity:1;"/>
<path d="M40.1775 44.5316L41.0194 47.0628C42.142 47.9067 43.5452 47.0634 43.5452 47.0634C43.5452 47.0634 45.5098 43.9696 46.9131 43.6884C47.755 43.1257 49.1022 41.6628 47.755 40.3128C46.0711 38.6253 39.3355 38.6253 38.4935 41.1566C37.82 43.1816 39.3355 44.2503 40.1775 44.5316Z" fill="${noseColor}" stroke="black" style="fill:${noseColor};fill-opacity:1;stroke:black;stroke-opacity:1;" stroke-width="2"/>
<path d="M57.0167 39.469C58.9813 38.6252 63.5841 37.1065 66.2784 37.7815M39.3355 38.6251C38.4935 38.3438 36.3044 37.95 34.2837 38.6251M36.8096 50.4376L37.6516 58.8751L40.1774 48.7501L36.8096 50.4376ZM48.5971 49.5939V57.1876L51.123 51.2814L48.5971 49.5939Z" stroke="black" style="stroke:black;stroke-opacity:1;" stroke-width="2"/>
<path d="M43.0617 77.156C42.3881 73.781 46.1489 67.3122 48.1135 64.4997C48.9555 63.2347 51.4813 64.4997 54.0072 64.4997C56.0279 64.4997 55.9718 65.0622 55.6911 65.3435L54.0072 67.031C53.1652 67.8747 54.8491 77.156 54.0072 80.531C53.1652 83.906 54.0072 83.906 50.6393 84.7497C47.2715 85.5935 43.9036 84.7497 43.0616 84.7497C42.2197 84.7497 40.5359 83.0622 40.201 81.3747C39.9331 80.0247 41.9965 80.8122 43.0617 81.3747C43.3424 81.3747 43.7353 80.531 43.0617 77.156Z" fill="${tongueColor}" stroke="black" style="fill:${tongueColor};fill-opacity:1;stroke:black;stroke-opacity:1;" stroke-width="2"/>
</g>
<defs>
<clipPath id="clip0_23723_22255">
<rect width="120" height="120" rx="60" fill="white" style="fill:white;fill-opacity:1;"/>
</clipPath>
</defs>
</svg>`;
};

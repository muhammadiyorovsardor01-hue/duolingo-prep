export const SCENES = [
  {
    id: 'coffee_shop',
    title: 'Rainy Afternoon Café',
    imageDescription: 'A warm indoor coffee shop scene during a rainy afternoon. Through a tall arched window, raindrops fall onto a quiet street. Behind the wooden counter on the left, a smiling barista in a green apron pours steamed milk into a ceramic cup next to an espresso machine and pastry display case. In the foreground at a round oak table, a young student wearing a mustard sweater types on an open silver laptop beside a steaming mug and a notebook.',
    svg: `<svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cozy coffee shop scene">
      <defs>
        <linearGradient id="cafeWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F6EDE2"/>
          <stop offset="100%" stop-color="#EBD9C5"/>
        </linearGradient>
        <linearGradient id="rainSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#7EA6C4"/>
          <stop offset="100%" stop-color="#B9D0E0"/>
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#cafeWall)"/>
      <rect y="310" width="640" height="110" fill="#B5835A"/>
      <path d="M0 340 H640 M0 375 H640" stroke="#9C6B43" stroke-width="2" opacity="0.5"/>
      <!-- Rainy Window -->
      <path d="M350 45 H585 V255 H350 Z" fill="url(#rainSky)" stroke="#5E4634" stroke-width="8"/>
      <line x1="467" y1="45" x2="467" y2="255" stroke="#5E4634" stroke-width="6"/>
      <line x1="350" y1="150" x2="585" y2="150" stroke="#5E4634" stroke-width="6"/>
      <g stroke="#E3F2FD" stroke-width="2" stroke-linecap="round" opacity="0.8">
        <line x1="375" y1="70" x2="368" y2="95"/><line x1="415" y1="85" x2="408" y2="112"/>
        <line x1="510" y1="68" x2="503" y2="94"/><line x1="550" y1="100" x2="543" y2="128"/>
        <line x1="395" y1="175" x2="388" y2="205"/><line x1="530" y1="180" x2="523" y2="210"/>
      </g>
      <!-- Hanging warm lamps -->
      <line x1="150" y1="0" x2="150" y2="62" stroke="#3D2B1F" stroke-width="3"/>
      <path d="M126 62 H174 L184 86 H116 Z" fill="#E07A2B"/>
      <ellipse cx="150" cy="92" rx="22" ry="7" fill="#FFE082" opacity="0.7"/>
      <line x1="270" y1="0" x2="270" y2="54" stroke="#3D2B1F" stroke-width="3"/>
      <path d="M248 54 H292 L300 76 H240 Z" fill="#E07A2B"/>
      <!-- Menu Board -->
      <rect x="40" y="55" width="160" height="90" rx="6" fill="#2A3439" stroke="#6B4F3B" stroke-width="5"/>
      <g fill="#F4EFE6" opacity="0.85">
        <rect x="55" y="74" width="70" height="6" rx="3"/><rect x="145" y="74" width="35" height="6" rx="3"/>
        <rect x="55" y="94" width="85" height="6" rx="3"/><rect x="145" y="94" width="35" height="6" rx="3"/>
        <rect x="55" y="114" width="60" height="6" rx="3"/><rect x="145" y="114" width="35" height="6" rx="3"/>
      </g>
      <!-- Barista -->
      <circle cx="155" cy="175" r="22" fill="#F2C29B"/>
      <path d="M133 170 C133 148 177 148 177 170 Z" fill="#3B2A22"/>
      <path d="M122 250 L130 198 H180 L188 250 Z" fill="#2B7A4B"/>
      <circle cx="148" cy="174" r="2.5" fill="#2A1D17"/><circle cx="163" cy="174" r="2.5" fill="#2A1D17"/>
      <path d="M149 184 Q155 190 162 184" stroke="#9E4738" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Counter & Espresso Machine -->
      <rect x="28" y="235" width="270" height="95" rx="6" fill="#7D5233"/>
      <rect x="22" y="226" width="282" height="14" rx="4" fill="#5A3921"/>
      <rect x="44" y="178" width="68" height="48" rx="5" fill="#90A4AE"/>
      <rect x="52" y="186" width="52" height="16" rx="3" fill="#CFD8DC"/>
      <!-- Pastry Case -->
      <rect x="210" y="180" width="80" height="46" rx="4" fill="#E0F7FA" fill-opacity="0.7" stroke="#546E7A" stroke-width="2"/>
      <ellipse cx="235" cy="212" rx="12" ry="7" fill="#D98B48"/>
      <ellipse cx="266" cy="212" rx="12" ry="7" fill="#C97837"/>
      <!-- Customer with Laptop -->
      <circle cx="485" cy="186" r="24" fill="#E8B48D"/>
      <path d="M460 185 C460 155 512 155 510 190 C500 175 470 175 460 185 Z" fill="#231F20"/>
      <path d="M442 292 L456 212 H514 L528 292 Z" fill="#E09F2D"/>
      <!-- Round Table -->
      <ellipse cx="430" cy="306" rx="108" ry="18" fill="#6D4529"/>
      <rect x="422" y="318" width="16" height="75" fill="#462B19"/>
      <ellipse cx="430" cy="393" rx="46" ry="9" fill="#462B19"/>
      <!-- Laptop & Coffee Mug -->
      <polygon points="392,296 456,296 448,256 384,256" fill="#B0BEC5" stroke="#455A64" stroke-width="2"/>
      <rect x="382" y="296" width="86" height="7" rx="3" fill="#78909C"/>
      <rect x="348" y="276" width="22" height="22" rx="4" fill="#FFFFFF" stroke="#CFD8DC" stroke-width="2"/>
      <path d="M342 268 Q348 258 354 268" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.8"/>
    </svg>`
  },
  {
    id: 'university_library',
    title: 'University Library Study',
    imageDescription: 'Two university students studying together at a long wooden table inside a sunlit library. Tall arched windows let bright daylight stream across rows of colorful bookshelves in the background. Stacks of textbooks, an open notebook, a highlighter, and a green desk lamp rest on the table as one student points to a diagram while explaining a concept to her classmate.',
    svg: `<svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="University library study scene">
      <rect width="640" height="420" fill="#F2EFE9"/>
      <rect y="325" width="640" height="95" fill="#D2B48C"/>
      <!-- Arched Windows -->
      <path d="M40 230 V95 A65 65 0 0 1 170 95 V230 Z" fill="#CFE8F7" stroke="#A68B6A" stroke-width="6"/>
      <path d="M470 230 V95 A65 65 0 0 1 600 95 V230 Z" fill="#CFE8F7" stroke="#A68B6A" stroke-width="6"/>
      <!-- Bookshelf center -->
      <rect x="200" y="40" width="240" height="220" rx="4" fill="#6F4E37"/>
      <rect x="212" y="52" width="216" height="46" fill="#4E3524"/>
      <rect x="212" y="110" width="216" height="46" fill="#4E3524"/>
      <rect x="212" y="168" width="216" height="46" fill="#4E3524"/>
      <!-- Books on shelves -->
      <g>
        <rect x="218" y="60" width="14" height="38" fill="#E74C3C"/><rect x="234" y="64" width="12" height="34" fill="#3498DB"/>
        <rect x="248" y="58" width="16" height="40" fill="#2ECC71"/><rect x="266" y="66" width="13" height="32" fill="#F39C12"/>
        <rect x="290" y="60" width="18" height="38" fill="#9B59B6"/><rect x="312" y="62" width="14" height="36" fill="#1ABC9C"/>
        <rect x="220" y="118" width="15" height="38" fill="#3498DB"/><rect x="238" y="122" width="14" height="34" fill="#E67E22"/>
        <rect x="255" y="116" width="16" height="40" fill="#27AE60"/><rect x="330" y="120" width="15" height="36" fill="#E74C3C"/>
        <rect x="224" y="176" width="16" height="38" fill="#F1C40F"/><rect x="244" y="178" width="14" height="36" fill="#2980B9"/>
        <rect x="300" y="174" width="18" height="40" fill="#D35400"/><rect x="348" y="178" width="15" height="36" fill="#16A085"/>
      </g>
      <!-- Student Left -->
      <circle cx="210" cy="200" r="25" fill="#F1C29B"/>
      <path d="M185 198 C185 166 238 166 235 202 L242 225 H180 Z" fill="#4A3222"/>
      <path d="M168 302 L182 228 H238 L252 302 Z" fill="#3B6EA5"/>
      <!-- Student Right -->
      <circle cx="425" cy="196" r="24" fill="#D99B72"/>
      <path d="M401 190 C403 166 447 166 449 190 Z" fill="#1E1B18"/>
      <path d="M385 302 L396 224 H454 L465 302 Z" fill="#D95D39"/>
      <!-- Long Study Table -->
      <rect x="85" y="295" width="470" height="22" rx="6" fill="#8D5B3A"/>
      <rect x="115" y="317" width="20" height="90" fill="#6A4329"/>
      <rect x="505" y="317" width="20" height="90" fill="#6A4329"/>
      <!-- Green Desk Lamp -->
      <rect x="130" y="285" width="38" height="10" rx="4" fill="#B7950B"/>
      <path d="M148 285 V240 L175 225" stroke="#B7950B" stroke-width="5" fill="none"/>
      <path d="M160 225 H200 L192 208 H168 Z" fill="#1E8449"/>
      <!-- Books & Open Notebook -->
      <rect x="275" y="274" width="90" height="21" rx="2" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
      <line x1="320" y1="274" x2="320" y2="295" stroke="#94A3B8" stroke-width="2"/>
      <rect x="465" y="278" width="54" height="17" rx="2" fill="#2E86C1"/>
      <rect x="470" y="263" width="46" height="15" rx="2" fill="#E74C3C"/>
    </svg>`
  },
  {
    id: 'farmers_market',
    title: 'Autumn Farmers Market',
    imageDescription: 'A lively outdoor farmers market under striped canvas awnings on a crisp autumn morning. Wooden crates overflow with red apples, orange pumpkins, fresh leafy greens, and yellow lemons. A vendor wearing a straw hat weighs produce on a scale while a shopper holding a woven tote bag smiles and picks out fresh fruit.',
    svg: `<svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Outdoor farmers market scene">
      <rect width="640" height="420" fill="#DDF0F9"/>
      <circle cx="545" cy="70" r="34" fill="#FFD166"/>
      <!-- Trees in background -->
      <circle cx="95" cy="175" r="55" fill="#E07A2B" opacity="0.85"/>
      <circle cx="545" cy="180" r="60" fill="#E9B44C" opacity="0.85"/>
      <rect y="280" width="640" height="140" fill="#E3D9C6"/>
      <!-- Market Stall -->
      <rect x="110" y="135" width="300" height="175" fill="#9E6B43"/>
      <rect x="98" y="88" width="324" height="54" fill="#FFFFFF"/>
      <g fill="#E53935">
        <rect x="98" y="88" width="40" height="54"/><rect x="178" y="88" width="40" height="54"/>
        <rect x="258" y="88" width="40" height="54"/><rect x="338" y="88" width="40" height="54"/>
      </g>
      <!-- Vendor -->
      <circle cx="235" cy="178" r="22" fill="#F0B890"/>
      <ellipse cx="235" cy="158" rx="34" ry="8" fill="#E9C46A"/>
      <path d="M217 156 C220 140 250 140 253 156 Z" fill="#D4A338"/>
      <path d="M202 235 L212 198 H258 L268 235 Z" fill="#457B9D"/>
      <!-- Crates of Produce -->
      <rect x="115" y="232" width="90" height="50" rx="4" fill="#B5835A" stroke="#7A5230" stroke-width="2"/>
      <circle cx="135" cy="232" r="11" fill="#D62828"/><circle cx="158" cy="230" r="12" fill="#E63946"/><circle cx="182" cy="232" r="11" fill="#D62828"/>
      <rect x="215" y="232" width="90" height="50" rx="4" fill="#B5835A" stroke="#7A5230" stroke-width="2"/>
      <circle cx="236" cy="230" r="13" fill="#F77F00"/><circle cx="262" cy="228" r="14" fill="#F77F00"/><circle cx="288" cy="230" r="12" fill="#FCBF49"/>
      <rect x="315" y="232" width="90" height="50" rx="4" fill="#B5835A" stroke="#7A5230" stroke-width="2"/>
      <circle cx="336" cy="231" r="12" fill="#43AA8B"/><circle cx="360" cy="229" r="13" fill="#2D8A68"/><circle cx="384" cy="231" r="12" fill="#43AA8B"/>
      <!-- Shopper -->
      <circle cx="485" cy="178" r="23" fill="#E4A97E"/>
      <path d="M462 174 C465 148 508 148 510 182 Z" fill="#5D3A24"/>
      <path d="M452 308 L462 206 H510 L520 308 Z" fill="#2A9D8F"/>
      <rect x="462" y="308" width="20" height="72" fill="#264653"/>
      <rect x="490" y="308" width="20" height="72" fill="#264653"/>
      <!-- Woven Tote Bag -->
      <rect x="430" y="255" width="40" height="44" rx="5" fill="#E9C46A" stroke="#B68D2D" stroke-width="2"/>
      <path d="M440 255 C440 236 460 236 460 255" stroke="#B68D2D" stroke-width="3" fill="none"/>
    </svg>`
  },
  {
    id: 'science_lab',
    title: 'Modern Research Laboratory',
    imageDescription: 'A scientist in a crisp white lab coat and safety goggles working inside a bright modern chemistry and biology laboratory. She carefully adjusts a black microscope on a clean workbench surrounded by glass beakers, Erlenmeyer flasks filled with blue and green solutions, and test tubes in a rack. A digital monitor displaying molecular charts sits on the wall behind her.',
    svg: `<svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Science laboratory scene">
      <rect width="640" height="420" fill="#ECF3F8"/>
      <rect y="285" width="640" height="135" fill="#CBD8E3"/>
      <!-- Wall Monitor -->
      <rect x="415" y="55" width="165" height="105" rx="8" fill="#1E293B" stroke="#64748B" stroke-width="5"/>
      <polyline points="435,130 465,105 495,120 530,82 560,96" fill="none" stroke="#38BDF8" stroke-width="4" stroke-linecap="round"/>
      <circle cx="495" cy="120" r="5" fill="#4ADE80"/><circle cx="530" cy="82" r="5" fill="#4ADE80"/>
      <!-- Glass Shelves -->
      <rect x="55" y="105" width="180" height="8" rx="3" fill="#94A3B8"/>
      <rect x="75" y="65" width="26" height="40" rx="4" fill="#7DD3FC" opacity="0.8"/>
      <rect x="115" y="55" width="30" height="50" rx="4" fill="#86EFAC" opacity="0.8"/>
      <rect x="160" y="70" width="24" height="35" rx="4" fill="#FDE047" opacity="0.85"/>
      <!-- Researcher -->
      <circle cx="315" cy="152" r="26" fill="#F1C29B"/>
      <path d="M288 150 C288 118 344 118 342 152 Z" fill="#3B2F2F"/>
      <!-- Safety goggles -->
      <rect x="295" y="142" width="18" height="12" rx="4" fill="#BAE6FD" stroke="#0284C7" stroke-width="2"/>
      <rect x="317" y="142" width="18" height="12" rx="4" fill="#BAE6FD" stroke="#0284C7" stroke-width="2"/>
      <!-- White Lab Coat -->
      <path d="M262 285 L278 182 H352 L368 285 Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
      <path d="M302 182 L315 215 L328 182 Z" fill="#38BDF8"/>
      <!-- Lab Bench -->
      <rect x="45" y="275" width="550" height="22" rx="5" fill="#334155"/>
      <!-- Microscope -->
      <rect x="215" y="258" width="54" height="17" rx="3" fill="#1E293B"/>
      <path d="M250 258 C264 236 262 205 240 198" stroke="#475569" stroke-width="9" fill="none" stroke-linecap="round"/>
      <rect x="228" y="182" width="16" height="38" rx="3" transform="rotate(-18 228 182)" fill="#0F172A"/>
      <!-- Flasks & Test Tube Rack -->
      <polygon points="390,275 430,275 416,232 404,232" fill="#38BDF8" fill-opacity="0.7" stroke="#0284C7" stroke-width="2"/>
      <rect x="450" y="228" width="32" height="47" rx="4" fill="#4ADE80" fill-opacity="0.7" stroke="#16A34A" stroke-width="2"/>
      <rect x="505" y="242" width="66" height="33" rx="3" fill="#94A3B8"/>
      <rect x="516" y="216" width="10" height="42" rx="5" fill="#F472B6"/><rect x="534" y="216" width="10" height="42" rx="5" fill="#60A5FA"/><rect x="552" y="216" width="10" height="42" rx="5" fill="#FACC15"/>
    </svg>`
  },
  {
    id: 'coastal_bridge',
    title: 'Sunset Bridge Cyclists',
    imageDescription: 'Two cyclists riding bicycles side by side along a pedestrian lane across a striking red suspension bridge overlooking a calm ocean bay at sunset. The sky glows in warm shades of orange, pink, and golden yellow above distant sailboats and rolling hills on the horizon.',
    svg: `<svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cyclists on coastal bridge at sunset">
      <defs>
        <linearGradient id="sunsetSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3B4371"/>
          <stop offset="55%" stop-color="#F3904F"/>
          <stop offset="100%" stop-color="#FFD89B"/>
        </linearGradient>
      </defs>
      <rect width="640" height="270" fill="url(#sunsetSky)"/>
      <circle cx="480" cy="185" r="42" fill="#FFF3B0"/>
      <!-- Distant hills & Ocean -->
      <path d="M0 240 Q120 190 260 240 Z" fill="#4A5568"/>
      <rect y="240" width="640" height="180" fill="#2B6CB0"/>
      <path d="M380 260 L400 260 L392 242 Z" fill="#FFFFFF" opacity="0.85"/>
      <!-- Suspension Bridge -->
      <rect x="135" y="65" width="20" height="240" fill="#D9381E"/>
      <rect x="435" y="95" width="16" height="210" fill="#D9381E"/>
      <path d="M0 220 Q70 250 145 75 Q295 250 443 105 Q540 230 640 200" fill="none" stroke="#E54B2B" stroke-width="5"/>
      <g stroke="#E54B2B" stroke-width="2" opacity="0.85">
        <line x1="185" y1="150" x2="185" y2="290"/><line x1="230" y1="180" x2="230" y2="290"/>
        <line x1="275" y1="192" x2="275" y2="290"/><line x1="320" y1="188" x2="320" y2="290"/>
        <line x1="365" y1="168" x2="365" y2="290"/><line x1="410" y1="135" x2="410" y2="290"/>
      </g>
      <!-- Bridge Deck -->
      <rect y="290" width="640" height="130" fill="#64748B"/>
      <rect y="286" width="640" height="10" fill="#D9381E"/>
      <line x1="0" y1="355" x2="640" y2="355" stroke="#F8FAFC" stroke-width="4" stroke-dasharray="24 18"/>
      <!-- Cyclist 1 -->
      <circle cx="215" cy="336" r="24" fill="none" stroke="#1E293B" stroke-width="5"/>
      <circle cx="292" cy="336" r="24" fill="none" stroke="#1E293B" stroke-width="5"/>
      <polyline points="215,336 250,305 282,305 292,336 250,336 215,336" fill="none" stroke="#FF7A00" stroke-width="5"/>
      <circle cx="255" cy="242" r="14" fill="#F1C29B"/>
      <path d="M242 238 C245 224 268 224 270 238 Z" fill="#1CB0F6"/>
      <path d="M238 288 L248 258 L272 268 L262 296 Z" fill="#2BB656"/>
      <!-- Cyclist 2 -->
      <circle cx="345" cy="346" r="22" fill="none" stroke="#1E293B" stroke-width="4.5"/>
      <circle cx="415" cy="346" r="22" fill="none" stroke="#1E293B" stroke-width="4.5"/>
      <polyline points="345,346 376,318 405,318 415,346 376,346 345,346" fill="none" stroke="#38BDF8" stroke-width="4.5"/>
      <circle cx="382" cy="256" r="13" fill="#D99B72"/>
      <path d="M369 252 C372 238 395 238 397 252 Z" fill="#F59E0B"/>
      <path d="M365 300 L375 270 L398 280 L388 308 Z" fill="#E53935"/>
    </svg>`
  },
  {
    id: 'family_kitchen',
    title: 'Cooking Dinner Together',
    imageDescription: 'A father and his young daughter cooking dinner together in a bright modern kitchen. At a clean kitchen island covered with chopped carrots, tomatoes, and a wooden cutting board, the father stirs a simmering pot on the stove while the smiling child wearing a blue apron adds fresh herbs to a salad bowl. Sunlight shines through potted herbs on the windowsill.',
    svg: `<svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Family cooking in bright kitchen">
      <rect width="640" height="420" fill="#F8FAFC"/>
      <rect x="40" y="45" width="160" height="140" rx="6" fill="#CFE8F7" stroke="#94A3B8" stroke-width="6"/>
      <rect x="65" y="150" width="28" height="30" rx="4" fill="#B45309"/>
      <circle cx="79" cy="142" r="16" fill="#22C55E"/>
      <rect x="410" y="45" width="180" height="105" rx="6" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="3"/>
      <!-- Father -->
      <circle cx="255" cy="158" r="25" fill="#E5AE87"/>
      <path d="M230 152 C230 124 282 124 280 154 Z" fill="#2D241E"/>
      <path d="M214 275 L228 188 H282 L296 275 Z" fill="#F59E0B"/>
      <rect x="234" y="205" width="42" height="68" rx="4" fill="#FFFFFF"/>
      <!-- Daughter -->
      <circle cx="405" cy="188" r="21" fill="#F2C29B"/>
      <path d="M384 185 C384 160 428 160 426 186 Z" fill="#4A2E1B"/>
      <path d="M374 275 L385 214 H425 L436 275 Z" fill="#3B82F6"/>
      <!-- Kitchen Island -->
      <rect x="75" y="268" width="490" height="130" rx="8" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="2"/>
      <rect x="62" y="256" width="516" height="18" rx="5" fill="#94A3B8"/>
      <!-- Pot & Bowl -->
      <rect x="175" y="218" width="76" height="38" rx="6" fill="#475569"/>
      <rect x="166" y="226" width="94" height="6" rx="3" fill="#334155"/>
      <path d="M196 208 Q204 195 212 208 M218 205 Q226 192 234 205" stroke="#CBD5E1" stroke-width="3" fill="none" stroke-linecap="round"/>
      <rect x="295" y="242" width="72" height="14" rx="4" fill="#C68B59"/>
      <circle cx="315" cy="238" r="7" fill="#EF4444"/><circle cx="332" cy="238" r="6" fill="#F97316"/><circle cx="350" cy="238" r="7" fill="#22C55E"/>
      <path d="M405 228 H475 L465 256 H415 Z" fill="#FFFFFF" stroke="#94A3B8" stroke-width="2"/>
      <circle cx="440" cy="226" r="14" fill="#4ADE80"/>
    </svg>`
  },
  {
    id: 'mountain_hike',
    title: 'Sunrise Mountain Summit',
    imageDescription: 'A lone hiker wearing an orange jacket and carrying a dark green backpack stands on a rocky mountain ridge overlooking a vast valley of evergreen pine trees and misty mountain peaks at sunrise. Golden rays illuminate the sky while a winding trail leads down into the valley below.',
    svg: `<svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Hiker on mountain ridge at sunrise">
      <defs>
        <linearGradient id="mtnSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1E3A5F"/>
          <stop offset="60%" stop-color="#F6AD55"/>
          <stop offset="100%" stop-color="#FDE68A"/>
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#mtnSky)"/>
      <circle cx="495" cy="145" r="38" fill="#FFFBEB"/>
      <!-- Distant Mountain Layers -->
      <polygon points="0,290 140,145 310,275 470,130 640,280 640,420 0,420" fill="#64748B" opacity="0.65"/>
      <polygon points="0,315 210,190 385,295 565,180 640,260 640,420 0,420" fill="#334155" opacity="0.8"/>
      <!-- Pine Trees Valley -->
      <g fill="#1E4620">
        <polygon points="340,320 356,275 372,320"/><polygon points="375,330 392,282 409,330"/>
        <polygon points="420,325 438,274 456,325"/><polygon points="475,335 495,280 515,335"/>
      </g>
      <!-- Foreground Ridge -->
      <polygon points="0,335 120,255 245,270 380,420 0,420" fill="#475569"/>
      <polygon points="0,350 110,272 225,290 320,420 0,420" fill="#334155"/>
      <!-- Hiker -->
      <rect x="132" y="192" width="22" height="38" rx="6" fill="#166534"/>
      <circle cx="154" cy="176" r="14" fill="#F1C29B"/>
      <path d="M140 172 C142 158 168 158 168 172 Z" fill="#1E293B"/>
      <rect x="144" y="190" width="22" height="42" rx="6" fill="#FF7A00"/>
      <rect x="145" y="232" width="8" height="36" fill="#1E293B"/>
      <rect x="157" y="232" width="8" height="36" fill="#1E293B"/>
      <line x1="176" y1="205" x2="184" y2="270" stroke="#CBD5E1" stroke-width="3"/>
    </svg>`
  },
  {
    id: 'train_station',
    title: 'Morning Train Platform',
    imageDescription: 'Commuters waiting along a bright covered railway station platform as a sleek blue-and-white passenger train arrives on the tracks. Overhead hangs a clock and departure display board while travelers carrying suitcases and briefcases prepare to board.',
    svg: `<svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Railway station platform scene">
      <rect width="640" height="420" fill="#DCEEF8"/>
      <!-- Station Canopy -->
      <polygon points="0,0 640,0 640,70 0,105" fill="#475569"/>
      <rect x="260" y="75" width="120" height="44" rx="6" fill="#0F172A" stroke="#94A3B8" stroke-width="3"/>
      <circle cx="285" cy="97" r="13" fill="#FFFFFF"/>
      <line x1="285" y1="97" x2="285" y2="88" stroke="#0F172A" stroke-width="2"/>
      <line x1="285" y1="97" x2="293" y2="97" stroke="#0F172A" stroke-width="2"/>
      <rect x="308" y="86" width="58" height="6" rx="2" fill="#FACC15"/>
      <rect x="308" y="99" width="44" height="6" rx="2" fill="#38BDF8"/>
      <!-- Tracks & Arriving Train -->
      <rect y="280" width="640" height="40" fill="#64748B"/>
      <rect x="28" y="148" width="320" height="135" rx="18" fill="#F8FAFC" stroke="#334155" stroke-width="3"/>
      <rect x="28" y="218" width="320" height="24" fill="#1D4ED8"/>
      <rect x="52" y="168" width="68" height="38" rx="6" fill="#93C5FD"/>
      <rect x="140" y="168" width="58" height="38" rx="4" fill="#93C5FD"/>
      <rect x="218" y="168" width="58" height="38" rx="4" fill="#93C5FD"/>
      <circle cx="52" cy="258" r="9" fill="#FDE047"/>
      <!-- Platform -->
      <polygon points="0,310 640,275 640,420 0,420" fill="#CBD5E1"/>
      <line x1="0" y1="322" x2="640" y2="288" stroke="#FACC15" stroke-width="7"/>
      <!-- Commuter 1 with Suitcase -->
      <circle cx="440" cy="210" r="18" fill="#E5AE87"/>
      <path d="M422 206 C424 185 458 185 458 206 Z" fill="#1E293B"/>
      <rect x="422" y="232" width="36" height="58" rx="6" fill="#2563EB"/>
      <rect x="424" y="290" width="13" height="52" fill="#1E293B"/><rect x="443" y="290" width="13" height="52" fill="#1E293B"/>
      <rect x="470" y="275" width="34" height="52" rx="5" fill="#E11D48"/>
      <line x1="487" y1="250" x2="487" y2="275" stroke="#334155" stroke-width="4"/>
      <!-- Commuter 2 -->
      <circle cx="545" cy="218" r="17" fill="#F1C29B"/>
      <rect x="528" y="238" width="34" height="54" rx="6" fill="#059669"/>
      <rect x="531" y="292" width="12" height="48" fill="#334155"/><rect x="547" y="292" width="12" height="48" fill="#334155"/>
    </svg>`
  }
];

export function getSceneById(sceneId) {
  return SCENES.find((s) => s.id === sceneId) || SCENES[0];
}

import { aurelian } from "./config.js";

export function getAurelianCard() {
  return `༒══〔 𖣔 𝗔𝗨𝗥𝗘𝗟𝗜𝗔𝗡 〕══༒
┃𖣔│𓁹 𝗧𝗜𝗧𝗟𝗘: ${aurelian.title}
┃𖣔│𓁹 𝗔𝗟𝗜𝗔𝗦: ${aurelian.alias}
┃𖣔│𓁹 𝗡𝗔𝗧𝗨𝗥𝗘: ${aurelian.nature}
┃𖣔│𓁹 𝗔𝗚𝗘: ${aurelian.age}
┃𖣔│𓁹 𝗦𝗧𝗔𝗧𝗨𝗦: ${aurelian.status}
┃𖣔│𓁹 𝗔𝗟𝗜𝗚𝗡𝗠𝗘𝗡𝗧: ${aurelian.alignment}
┃𖣔│𓁹 𝗣𝗢𝗪𝗘𝗥: ${aurelian.power}
┃𖣔│𓁹 𝗪𝗘𝗔𝗣𝗢𝗡: ${aurelian.weapon}
┃𖣔│𓁹 𝗥𝗔𝗡𝗞: ${aurelian.rank}
┃𖣔│𓁹 𝗪𝗘𝗔𝗞𝗡𝗘𝗦𝗦: ${aurelian.weakness}

༒══〔 𖣔 𝗢𝗥𝗜𝗚𝗜𝗡 〕══༒
${aurelian.origin || "Born before kingdoms, gods, and mortal legends."}

༒══〔 𖣔 𝗣𝗘𝗥𝗦𝗢𝗡𝗔𝗟𝗜𝗧𝗬 〕══༒
Calm • Mysterious • Regal • Powerful
Unpredictable • Ancient • Divine

༒══〔 𖣔 𝗔𝗕𝗜𝗟𝗜𝗧𝗜𝗘𝗦 〕══༒
Primordial Authority
Celestial Energy
Shadow Manipulation
Eternal Regeneration
Reality Distortion
Divine Perception
Soul Dominion
Immortal Awakening
Celestial Blade
First Light

༒══〔 𖣔 𝗠𝗢𝗧𝗧𝗢 〕══༒
"${aurelian.motto}"

༒════════════════════༒
☠️ ${aurelian.botName} • ${aurelian.title}
`;
}

export default getAurelianCard;

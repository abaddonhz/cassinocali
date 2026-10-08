const prices={
 armas:[['TACTICAL RIFLE',1240000,1054000],['G36',1050000,892000],['AUG',890000,756500],['AK-47',750000,637500],['AK-44',630000,535500],['MTAR',540000,459000],['UZI',460000,391000],['THOMPSON',390000,331500],['TEC-9',330000,280500],['FIVE-SEVEN',280000,238000],['LOCKPICK',30000,25500],['C4',30000,25500]],
 municoes:[['MUNI. TACTICAL RIFLE',6000,5100],['MUNI. G36',5500,4675],['MUNI. AUG',4950,4208],['MUNI. AK-47',4500,3825],['MUNI. AK-44',4100,3485],['MUNI. MTAR',3700,3145],['MUNI. UZI',3400,2890],['MUNI. THOMPSON',3000,2550],['MUNI. TEC-9',2800,2380],['MUNI. FIVE-SEVEN',2500,2125],['LOCKPICK',30000,25500],['C4',30000,25500]],
 equipamentos:[['COLETE',80000,68000],['ALGEMA',35000,29750],['CAPUZ',45000,38250],['MOCHILA X',45000,38250],['ANABOLIZANTE',45000,38250],['LOCKPICK',30000,25500],['C4',30000,25500]]
};
const factions=['Abutres','CapCaos','Milícia','Smoke','Tríade','Yakuza','Máfia','D7','Bratva','Camorra','Cartel','Elements','LostMC','Medelin','RoseMC','BadBoyys','Bahamas','Cassino','Galaxy','Tequila','Vipers','Ballas','Belgica','B-13','França','Turquia','Tropa CRG','Colombia'];
const money=n=>'R$ '+n.toLocaleString('pt-BR');
module.exports=async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 if(!process.env.DISCORD_BOT_TOKEN && !process.env.DISCORD_WEBHOOK_URL)return res.status(503).json({error:'Configure DISCORD_BOT_TOKEN e DISCORD_CHANNEL_ID ou DISCORD_WEBHOOK_URL na Vercel'});
 try{
  const {seller,passport,category,product,quantity,priceType,faction}=req.body||{};
  const clean=v=>typeof v==='string'?v.trim():'';
  if(!clean(seller)||clean(seller).length>70||!clean(passport)||clean(passport).length>20||!/^\d{1,20}$/.test(clean(passport))||!Number.isSafeInteger(quantity)||quantity<1||quantity>100000||!['normal','parceria'].includes(priceType)||!factions.includes(faction)||!prices[category])return res.status(400).json({error:'Dados inválidos'});
  const item=prices[category].find(r=>r[0]===product);if(!item)return res.status(400).json({error:'Produto inválido'});
  const unit=item[priceType==='parceria'?2:1];const total=unit*quantity;
  const safe=v=>String(v).replace(/@/g,'＠').replace(/[`*_~|>]/g,'').slice(0,100);
  const payload={username:'Cassino • Registro de Vendas',allowed_mentions:{parse:[]},embeds:[{title:'♠ NOVA VENDA REGISTRADA',color:0xD9AD62,fields:[{name:'Vendedor',value:safe(seller),inline:true},{name:'Passaporte',value:safe(passport),inline:true},{name:'Facção compradora',value:safe(faction),inline:false},{name:'Categoria',value:safe(category),inline:true},{name:'Produto',value:safe(product),inline:true},{name:'Quantidade',value:String(quantity),inline:true},{name:'Tabela',value:priceType==='parceria'?'Com parceria':'Preço normal',inline:true},{name:'Preço unitário',value:money(unit),inline:true},{name:'TOTAL',value:'**'+money(total)+'**',inline:false}],footer:{text:'Cassino Califórnia RP • Painel de Gerenciamento'},timestamp:new Date().toISOString()}]};
  // Primeiro tenta publicar usando o bot oficial, sem depender do PC ligado.
  const token=process.env.DISCORD_BOT_TOKEN;
  const channel=process.env.DISCORD_CHANNEL_ID;
  const webhook=process.env.DISCORD_WEBHOOK_URL;
  const discordPayload={embeds:payload.embeds,allowed_mentions:{parse:[]}};
  const post=async(url,headers,body)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
  let botError='Bot não configurado';
  if(token && /^\d{17,22}$/.test(channel||'')){
   try{
    const r=await post(`https://discord.com/api/v10/channels/${channel}/messages`,{Authorization:`Bot ${token}`},discordPayload);
    if(r.ok)return res.status(200).json({ok:true,via:'bot'});
    botError=`Bot: HTTP ${r.status}`;
    // Erro 5xx ou 429 pode ter sido processado; não duplicar o registro pelo webhook.
    if(r.status>=500 || r.status===429)return res.status(502).json({error:'Discord temporariamente indisponível. Confira o canal antes de reenviar.'});
   }catch(e){console.error('Falha de conexão do bot:',e.message);return res.status(502).json({error:'Não foi possível confirmar o envio pelo bot. Confira o canal antes de tentar novamente.'});}
  }
  if(webhook && /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/.test(webhook)){
   try{
    const r=await post(webhook+'?wait=true',{},payload);
    if(r.ok)return res.status(200).json({ok:true,via:'webhook'});
    return res.status(502).json({error:`Bot indisponível (${botError}) e webhook rejeitado (HTTP ${r.status})`});
   }catch(e){console.error('Erro no webhook:',e.message);return res.status(502).json({error:'Webhook não confirmou o envio. Confira o canal antes de tentar novamente.'});}
  }
  return res.status(503).json({error:`${botError}. Configure o webhook reserva na Vercel.`});
 }catch(e){console.error('Erro no registro:',e);return res.status(500).json({error:'Erro interno ao registrar'})}
};

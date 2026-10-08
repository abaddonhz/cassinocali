const LIMIT=8*1024;
module.exports=async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Método não permitido'});}
 try{
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
  const nome=clean(data.nome,60),id=clean(data.idCidade,15),fidelidade=clean(data.fidelidade,500),lealdade=clean(data.lealdade,500),compromisso=clean(data.compromisso,700);
  if(nome.length<2||!/^\d{1,15}$/.test(id)||[fidelidade,lealdade,compromisso].some(x=>x.length<2))return res.status(400).json({error:'Preencha todos os campos corretamente.'});
  if(JSON.stringify(data).length>LIMIT)return res.status(413).json({error:'Formulário muito grande'});
  const embed={color:0xD9AD62,author:{name:'CASSINO • REGISTRO DE JURAMENTO'},title:'📜 Juramento de Fidelidade',description:'Um novo juramento foi registrado pelo painel do Cassino.',fields:[{name:'👤 Nome na cidade',value:nome,inline:true},{name:'🪪 ID na cidade',value:id,inline:true},{name:'🤝 Fidelidade à facção',value:fidelidade},{name:'🛡️ Lealdade e respeito',value:lealdade},{name:'⚜️ Compromisso com a família',value:compromisso}],footer:{text:'Registro enviado pelo site • Sem vinculação automática à conta Discord'},timestamp:new Date().toISOString()};
  const body={embeds:[embed],allowed_mentions:{parse:[]}};
  const token=process.env.DISCORD_BOT_TOKEN,channel=process.env.DISCORD_JURAMENTO_CHANNEL_ID;
  let botError='';
  if(token&&channel){
   try{const r=await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channel)}/messages`,{method:'POST',headers:{Authorization:`Bot ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});if(r.ok)return res.status(200).json({ok:true,via:'bot'});botError=`Bot: ${r.status}`;}catch(e){botError='Falha de conexão com bot';}
  }
  const webhook=process.env.DISCORD_JURAMENTO_WEBHOOK_URL;
  if(webhook){
   try{const u=new URL(webhook);if(u.hostname!=='discord.com'&&u.hostname!=='discordapp.com')throw Error('URL inválida');if(!/^\/api\/webhooks\/\d+\/[^/]+$/.test(u.pathname))throw Error('Webhook inválido');const r=await fetch(webhook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(r.ok)return res.status(200).json({ok:true,via:'webhook'});}catch(e){console.error('Falha no webhook de juramento:',e.message);}
  }
  console.error('Juramento não enviado:',botError);
  return res.status(502).json({error:'Falha ao publicar. Verifique as configurações do canal de juramento.'});
 }catch(e){console.error('Erro no juramento:',e.message);return res.status(500).json({error:'Erro interno ao processar juramento'});}
};
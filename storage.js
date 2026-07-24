/**
 * storage.js — Pure localStorage persistence layer for AI Music
 * Features:
 *  - Per-user scoped keys (each user gets own data)
 *  - Guest mode (no account required)
 *  - Auto-save on every change
 *  - Survives browser close / tab close / page reload
 *  - Server sync support (when server available)
 *  - Import/Export for GitHub Pages (no-server)
 *  - Cross-tab sync via storage events
 */
(function(){
  'use strict';

  const PREFIX = 'aimusic';

  function k(uid, key){ return PREFIX + ':' + uid + ':' + key; }
  function safeGet(raw){
    try{ return JSON.parse(raw); }catch(e){ return null; }
  }
  async function hashPass(pass){
    try{
      const enc=new TextEncoder().encode(pass);
      const buf=await crypto.subtle.digest('SHA-256',enc);
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(e){return pass;}
  }

  window.AppStorage = {
    /* ── Auth ── */
    listUsers(){
      try{ return JSON.parse(localStorage.getItem(PREFIX+':users')||'[]'); }catch(e){ return []; }
    },
    async register(name, email, userId, pass){
      const users = this.listUsers();
      if(users.some(u=>u.id===userId)) return {ok:false, error:'User ID already exists'};
      const hashed = await hashPass(pass);
      users.push({ id:userId, name:name, email:email, pass:hashed, created:Date.now() });
      localStorage.setItem(PREFIX+':users', JSON.stringify(users));
      this._login(userId);
      this.migrateGuest();
      return {ok:true};
    },
    async login(userId, pass){
      const users = this.listUsers();
      const u = users.find(x=>x.id===userId);
      if(!u) return {ok:false, error:'Account not found'};
      const hashed = await hashPass(pass);
      if(u.pass !== hashed) return {ok:false, error:'Wrong password'};
      this._login(userId);
      return {ok:true, user:{ name:u.name, email:u.email, id:u.id }};
    },
    _login(userId){
      localStorage.setItem(PREFIX+':session', userId);
    },
    logout(){
      const uid = this.currentUserId();
      if(uid) this.saveAll();
      localStorage.removeItem(PREFIX+':session');
    },
    currentUserId(){
      return localStorage.getItem(PREFIX+':session') || null;
    },
    currentUser(){
      const uid = this.currentUserId();
      if(!uid) return null;
      const users = this.listUsers();
      return users.find(u=>u.id===uid) || null;
    },
    isLoggedIn(){ return !!this.currentUserId(); },

    /* ── Per-user data read/write ── */
    uid(){ return this.currentUserId() || '_guest'; },

    getSettings(){
      return safeGet(localStorage.getItem(k(this.uid(),'settings'))) || {
        volume:0.9, shuffle:false, repeat:'off', sortKey:'default', sortDir:1, theme:'system'
      };
    },
    saveSettings(d){
      localStorage.setItem(k(this.uid(),'settings'), JSON.stringify(d));
    },

    getFavorites(){
      return safeGet(localStorage.getItem(k(this.uid(),'favorites'))) || [];
    },
    saveFavorites(ids){
      localStorage.setItem(k(this.uid(),'favorites'), JSON.stringify(ids));
    },

    getPlaylists(){
      return safeGet(localStorage.getItem(k(this.uid(),'playlists'))) || {};
    },
    savePlaylists(obj){
      localStorage.setItem(k(this.uid(),'playlists'), JSON.stringify(obj));
    },

    getQueue(){
      return safeGet(localStorage.getItem(k(this.uid(),'queue'))) || [];
    },
    saveQueue(ids){
      localStorage.setItem(k(this.uid(),'queue'), JSON.stringify(ids));
    },

    getPlaystate(){
      return safeGet(localStorage.getItem(k(this.uid(),'playstate'))) || {
        currentId:null, activeList:'All', currentTime:0, duration:0
      };
    },
    savePlaystate(d){
      localStorage.setItem(k(this.uid(),'playstate'), JSON.stringify(d));
    },

    getTrackStats(){
      return safeGet(localStorage.getItem(k(this.uid(),'track_stats'))) || {};
    },
    saveTrackStats(d){
      localStorage.setItem(k(this.uid(),'track_stats'), JSON.stringify(d));
    },

    /* ── Bulk helpers ── */
    saveAll(){
      // Called on save events — each function handles its own key
    },
    exportAll(){
      const uid = this.uid();
      const data = {};
      ['settings','favorites','playlists','queue','playstate','track_stats'].forEach(key=>{
        const raw = localStorage.getItem(k(uid,key));
        if(raw) data[key] = JSON.parse(raw);
      });
      data._userId = uid;
      data._exported = Date.now();
      return data;
    },
    importAll(data){
      if(!data || !data._userId) return false;
      const uid = this.uid();
      ['settings','favorites','playlists','queue','playstate','track_stats'].forEach(key=>{
        if(data[key] != null) localStorage.setItem(k(uid,key), JSON.stringify(data[key]));
      });
      return true;
    },

    /* ── Migrate guest data into new account ── */
    migrateGuest(){
      const gid = '_guest';
      const uid = this.uid();
      if(uid === gid) return;
      ['settings','favorites','playlists','queue','playstate','track_stats'].forEach(key=>{
        const gRaw = localStorage.getItem(k(gid,key));
        if(gRaw && !localStorage.getItem(k(uid,key))){
          localStorage.setItem(k(uid,key), gRaw);
        }
      });
    },

    /* ── Server sync ── */
    async pushToServer(API_URL){
      if(!API_URL) return;
      try{
        const data = this.exportAll();
        await fetch(API_URL+'/api/sync/'+encodeURIComponent(this.uid()), {
          method:'PUT',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(data)
        });
      }catch(e){}
    },
    async pullFromServer(API_URL){
      if(!API_URL) return false;
      try{
        const r = await fetch(API_URL+'/api/sync/'+encodeURIComponent(this.uid()));
        if(!r.ok) return false;
        const data = await r.json();
        if(data && data._userId) return this.importAll(data);
        return false;
      }catch(e){ return false; }
    },

    /* ── Storage event listener for cross-tab sync ── */
    onStorageChange(cb){
      window.addEventListener('storage', function(e){
        if(e.key && e.key.startsWith(PREFIX)){
          cb(e);
        }
      });
    }
  };
})();

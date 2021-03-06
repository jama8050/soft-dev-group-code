var player;
var lastSong = null;
var startedSong = false;
var checkTime;
var currentTimeout;
var noAlbum = false;

window.onSpotifyWebPlaybackSDKReady = () => {
    //token is used to connect with spotify connect leaving this undone not sure how we want to authorize this
    //have to have spotify premium and get a code which expires every hour
    var token = Cookies.get('access_token');
    Cookies.remove('device_id');
    player = new Spotify.Player({
    name: 'Tracked Out',
        getOAuthToken: cb => { cb(token); }
    });
    // Error handling
    player.addListener('initialization_error', ({ message }) => { console.error(message); });
    player.addListener('authentication_error', ({ message }) => { console.error(message); });
    player.addListener('account_error', ({ message }) => { console.error(message); });
    player.addListener('playback_error', ({ message }) => { console.error(message); });



    // Playback status updates
    //player.addListener('player_state_changed', state => { console.log(state); });
    player.addListener('player_state_changed', ({
        position,
        duration,
        track_window: { current_track }
    }) => {
        if(!startedSong){
            startedSong = true;
            currentTimeout = setTimeout(function () {
                console.log('Timeout triggered');
                startedSong = false;
                $.get(location.protocol + "//" + location.host + "/player/remove-song", {sid: current_track.id}, function(data){
                    if(data === 'success'){
                        console.log('Song removed from DB');
                    }
                    else{
                        console.log('Song couldn\'t be removed from the db');
                    }
                });
                moveNextSong();
            }, duration);
            console.log('timeout set with duration ' + duration);
        }

        if(!noAlbum){
            console.log('Currently Playing', current_track.name);
            $("#song_title").html(current_track.name);//sets song name
            $("#artist_name").html(current_track.artists[0].name);
            $("#album").attr('src', current_track.album.images[2].url);//sets the album image    
        }
        
    });

    // Ready
    player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        Cookies.set('device_id', device_id);

        $('.room-btn').click(function(){
            checkTime = setInterval(function(){
                // console.log('done:' + Cookies.get('done'));
                if(Cookies.get('done')){
                    clearInterval(checkTime);
                    Cookies.remove('done');
                    moveNextSong();
                }
            }, 300);
        });
        
        // play_song(device_id, '1QFw2xxyQtgKjlrMCEqsNj'); // disclaimer: I don't know what song this is, I just looked up short songs on spotify. Listen to at your own risk.
    });

    // Not Ready
    player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
    });

    // Connect to the player
    player.connect();
};

//play/pause the current playing track. Maybe just have it mute?
var toggle = 1;

// function that plays the next song in the song queue
function moveNextSong(){
    clearTimeout(currentTimeout);
    if($('#queueList').children().length > 0){
        player.resume();
        noAlbum = false;
        var top = $('#firstInQueue'); // top element in the queue
        var newFirst = top.next(); // 2nd element in the queue

        var topSID = top.children('span').eq(0).text(); // SID of the top element in the queue
        var topDir = top.children('span').eq(1).text(); // duration of the top element in the queue

        play_song(Cookies.get('device_id'), topSID, topDir);
        
        top.remove(); // delete the top since we just played it
        newFirst.attr('id', 'firstInQueue'); // change the ID of the 2nd element in the queue to be the first element.
    }
    else{
        console.log('No songs in this room...');
        
        player.pause().then(() => {
            $("#song_title").text('No songs playing here yet');//sets song name
            $("#artist_name").text('Nope! None!');
            $("#album").attr('src', 'resources/imgs/zep.jpg');//sets the album image
        });
    }
    
}

function mute_button(){
    if(toggle === 0){
        player.setVolume(1).then(() => {
            console.log('Output has been unmuted');
            toggle = 1;
            $('#mute_button').html('<i class="fas fa-volume-up"></i>');
        });
    }else if(toggle === 1){
        player.setVolume(0).then(() => {
            console.log('Output has been muted.');
            toggle = 0;
            $('#mute_button').html('<i class="fas fa-volume-mute"></i>');
        });
    }
}

// play a song!
function play_song(device_id, sid, duration){
    //console.log(device_id);
    // if statement is an attempt to ensure we don't play the same song more than once
    if(lastSong == null || lastSong != sid){
        $.ajax({
            url:"https://api.spotify.com/v1/me/player/play?device_id=" + device_id,
            type: 'PUT',
            data: '{"uris":["spotify:track:' + sid + '"]}',
            headers: {
                'Authorization': 'Bearer ' + Cookies.get('access_token')
            },
            success: function() {
                console.log('Successfully played SID \'' + sid + '\'');
                startedSong = true;

                currentTimeout = setTimeout(function () {
                    console.log('Timeout triggered');
                    startedSong = false;
                    $.get(location.protocol + "//" + location.host + "/player/remove-song", {sid: sid}, function(data){
                        if(data === 'success'){
                            console.log('Song removed from DB');
                        }
                        else{
                            console.log('Song couldn\'t be removed from the db');
                        }
                    });
                    moveNextSong();
                }, duration);

                lastSong = sid;
            },
            error: function() {
                console.log('Failed to play SID \'' + sid + '\'');
            }
        });
    }
}

//"https://api.spotify.com/v1/me/player/play?device_id=6a7b699fbb3739e80509ecf181104d4a761ff16c" --data "{\"context_uri\":\"spotify:track:6jrPDxHjE2qOKbvFj9u4YX\",\"offset\":{\"position\":5},\"position_ms\":0}" -H "Accept: application/json" -H "Content-Type: application/json" -H "Authorization: Bearer BQAFruQt_8dDG6dm5FegQa5Q9sXSGJLNn6t89CajzX7qzfkTsAOgz0Uxeqv4e26hjtGgdjkbuQiQB7z4wPyX1M12xBfN3urDL8olCo3sg17sjhMbsUIunJIxH4cze5CO-tdFweNzYUTzzqTOuw"
(function() {
    'use strict';

    function FaceRecognitionService($http, $translate) {
        var service = {};
        service.faceId = null;
        service.isInitialized = false;

        service.init = function() {
            if(service.isInitialized) {
                return new Promise(function(success, failure){
                    success();
                })
            }

            var video = document.getElementById('video');
            if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
                    video.src = window.URL.createObjectURL(stream);
                    video.play();
                });
            }

            service.isInitialized = true;

            return new Promise(function(success, failure){
                setTimeout(success, 2000);
            })
        };

        service.takeSnapshot = function() {
            return this.init().
                then(takeSnapshot).
                then(detectFace).
                then(findSimilarFace).
                then(getFaceName);
        };

        service.addPerson = function(name) {
            return this.init().
                then(takeSnapshot).
                then(function(snapshot) { return addFaceToFaceList(snapshot, name); });
        };

        service.removePerson = function(name) {
            return getFacesInFaceList().
                then(function(faceIds) {return searchForFaceByName(faceIds, name)}).
                then(removeFace);
        };

        service.removeMe = function() {
            return this.init().
                then(takeSnapshot).
                then(detectFace).
                then(findSimilarFace).
                then(removeFace);
        };

        function takeSnapshot(){
            var canvas = document.getElementById('canvas');
            var context = canvas.getContext('2d');
            var video = document.getElementById('video');
            context.drawImage(video, 0, 0, 640, 480);
            return new Promise(function (success, failure) {
                canvas.toBlob(success, 'image/jpeg', 100);
            });
        }

        function detectFace(snapshot) {
            return $http({
                url: 'https://api.projectoxford.ai/face/v1.0/detect',
                method: 'post',
                data: snapshot,
                params: {
                    returnFaceId: true
                },
                headers: {
                    "Content-Type": "application/octet-stream",
                    "Ocp-Apim-Subscription-Key": config.faceRecognition.key
                }
            }).then(function mySucces(response) {
                console.log(response);
                if(response.data.length == 0)
                    return null;
                return response.data[0].faceId;
            }, function myError(response) {
                console.log(response);
            });
        };

        function findSimilarFace(faceId) {
            if(faceId === null)
                return undefined;

            return $http({
                url: 'https://api.projectoxford.ai/face/v1.0/findsimilars',
                method: 'post',
                data: { 
                    faceListId: config.faceRecognition.faceListId,
                    faceId: faceId,
                    maxNumOfCandidatesReturned: 1
                },
                headers: {
                    "Content-Type": "application/json",
                    "Ocp-Apim-Subscription-Key": config.faceRecognition.key
                }
            }).then(function mySucces(response) {
                console.log(response);
                if(response.data.length == 0)
                    return null;
                return response.data[0].persistedFaceId;
            }, function myError(response) {
                console.log(response);
            });
        };

        function getFaceName(persistedFaceId) {
            if(persistedFaceId === undefined)
                return $translate.instant('faceRecognition.showyourface');
            if(persistedFaceId === null)
                return $translate.instant('faceRecognition.idontknowyou');
            return getFacesInFaceList().
                then(function(faceIds) {
                    return searchForFaceByFaceId(faceIds, persistedFaceId)
                });
        };

        function getFacesInFaceList() {
            return $http({
                url: 'https://api.projectoxford.ai/face/v1.0/facelists/' + config.faceRecognition.faceListId,
                headers: {
                    "Ocp-Apim-Subscription-Key": config.faceRecognition.key
                }
            }).then(function mySucces(response) {
                console.log(response);
                return response.data.persistedFaces;
            }, function myError(response) {
                console.log(response);
            });
        };

        function searchForFaceByFaceId(faceIds, persistedFaceId) {
            for(var i in faceIds) {
                if(faceIds[i].persistedFaceId === persistedFaceId) {
                    return faceIds[i].userData;
                }
            }
            return null;
        };

        function searchForFaceByName(faceIds, name) {
            for(var i in faceIds) {
                if(faceIds[i].userData === name) {
                    return faceIds[i].persistedFaceId;
                }
            }
            return null;
        }

        function addFaceToFaceList(snapshot, name) {
            return $http({
                url: 'https://api.projectoxford.ai/face/v1.0/facelists/'+config.faceRecognition.faceListId+'/persistedFaces',
                method: 'post',
                data: snapshot,
                params: {
                    userData: name
                },
                headers: {
                    "Content-Type": "application/octet-stream",
                    "Ocp-Apim-Subscription-Key": config.faceRecognition.key
                }
            }).then(function mySucces(response) {
                console.log(response);
                return response.data.persistedFaceId;
            }, function myError(response) {
                console.log(response);
            });
        };

        function removeFace(persistedFaceId) {
            if(persistedFaceId == null)
                return;

            return $http({
                url: 'https://api.projectoxford.ai/face/v1.0/facelists/'+config.faceRecognition.faceListId+'/persistedFaces/'+persistedFaceId,
                method: 'delete',
                headers: {
                    "Ocp-Apim-Subscription-Key": config.faceRecognition.key
                }
            }).then(function mySucces(response) {
                console.log(response);
            }, function myError(response) {
                console.log(response);
            });
        };

        return service;
    }

    angular.module('SmartMirror').factory('FaceRecognitionService', FaceRecognitionService);
}(window.annyang));
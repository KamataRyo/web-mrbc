app = angular.module 'app', []

app.controller 'tabCtrl', [
    '$scope'
    ($scope) ->
        # initialize tab states
        $scope.fileUploadActive  = "active"
        $scope.directInputActive = "inactive"
        $scope.fromURLActive     = "inactive"
        $scope.active = "fileUpload"

        # select to toggle tabs
        $scope.select = (selection) ->
            $scope.fileUploadActive  = "inactive"
            $scope.directInputActive = "inactive"
            $scope.fromURLActive     = "inactive"
            $scope[selection + 'Active'] = "active"
            $scope.active = selection
]

docker run -e 'ACCEPT_EULA=Y' -e 'MSSQL_SA_PASSWORD=sa@123' \
 -p 1433:1433 --name sqlserver \
 -v sqlserverdata:/var/opt/mssql \
 -d mcr.microsoft.com/mssql/server

docker run -e 'ACCEPT_EULA=Y' -e 'MSSQL_SA_PASSWORD=sa@123' \
 -p 1433:1433 --name sqlserver \
 -d mcr.microsoft.com/mssql/server

docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=sa@123" -e "MSSQL_PID=Evaluation" -p 1433:1433  --name sqlpreview --hostname sqlpreview -d mcr.microsoft.com/mssql/server:2022-preview-ubuntu-22.04

# build-tools-throwaway
A temporary repo for collecting build tools to make project's package.json files more manageable. 


This may end up being the container for all tools required for buidling a project. That would allow us to clean out most of the cruft from our projhect directories and only have a single dependency which packages everything we need. 



## Assumptions

There shouyld be a single entry opint to the project. If we're building with Vite, then the entire site should be accessible in development from vite's url. No monkeying around with multriple addresses or needing to escape cross-orgiin. Just proxy all the PHP stuff. 

Rely on vite as much as possible. Do not re-invent the wheel and discard our own invented wheels with abandon if there's a popular alternative. 


### Additional things

Just going to accept that vite will work out the http2+proxy issue. It's not ideal, but it's not our problem alone. Maybe we can contribute to a fix upstream?
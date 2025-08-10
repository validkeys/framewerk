# Framewerk:

package name: @validkeys/framewerk

A toolkit for building our service/action architecture. 

The two main building blocks are services and handlers. A service at its core is a key/value where they key is the handler name and the value its implementation. 

A service defines a global set of dependencies required by any of it handlers to run. 

To instantiate a service, the consuming application must call the service’s make method with the dependencies required my that service. 

Ther service make method will then instantiate all of its handlers currying each with their dependencies providing the caller with a ready to use service. 

Services are defined by using the define service method. This method is called within a package. Define service uses the same builder pattern to define a service culminating in a build command. At the moment there are two methods on the defineService method. .withServiceDependencies<DependenciesType>() which defines the shape of external dependencies require by the service. The next is an .addHandler(name: string, impl: handler definition)

The handler is defined using the define handler method we have already defined. 

Each handler definition uses a builder pattern to define itself finalizing in a build method. The returned result is not the handler method but rather a definition of the handler including any and all meta data used to generate openApi documentation about the handler. 

Both the service and handler types should be externally defineable as a contract so that packages within a mono repo environment can import the service interface without needing the service definition. 

Finally, the return value of define service and define handler should be a data structure that lends itself to introspection for the purposes of codes generation (auto generate fastify endpoints, postman collections etc). 

Framewerk should by default expect all handlers to be defined in src/handlers/index.ts. It should expect the service to be defined in src/index.ts. 

Using what we’ve defined with the handler above, can you put together what our package would look like include the implementations?